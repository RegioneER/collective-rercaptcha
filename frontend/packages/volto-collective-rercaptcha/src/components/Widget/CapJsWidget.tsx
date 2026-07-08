import React, { useEffect, useRef } from 'react';
// Importazione della classe Cap (motore principale PoW)
import Cap from '@cap.js/widget';
// Importazione dei tipi per garantire la type-safety durante lo sviluppo
import type { CapConfig, CapProgressEvent } from '@cap.js/widget';

/**
 * Interfaccia delle proprietà accettate dal componente RerCapWidget.
 */
interface RerCapWidgetProps {
  /**
   * L'indirizzo URL del servizio API che fornisce la sfida (challenge).
   * Esempio: "https://captcha.gurl.eu.org/api/"
   */
  endpoint: string;

  /**
   * Funzione di callback chiamata quando il calcolo Proof of Work è completato con successo.
   * Riceve come parametro il token alfanumerico da inviare al backend per la verifica.
   */
  onSolve: (token: string) => void;

  /**
   * Callback opzionale chiamata in caso di errori (es. rete, WebAssembly disabilitato, endpoint errato).
   */
  onError?: (message: string) => void;

  /**
   * Callback opzionale per monitorare lo stato di avanzamento del calcolo (valore da 0 a 100).
   * Utile per mostrare barre di caricamento o log di debug.
   */
  onProgress?: (progress: number) => void;

  /**
   * Callback opzionale chiamata quando il captcha viene resettato internamente.
   */
  onReset?: () => void;

  /**
   * Numero di thread (WebWorkers) da dedicare al calcolo.
   * Se non specificato, la libreria usa navigator.hardwareConcurrency (tutti i core disponibili).
   */
  workerCount?: number;
}

/**
 * RerCapWidget: Componente invisibile (Headless) per la gestione del Captcha PoW.
 *
 * Questo componente NON renderizza nulla nel DOM (restituisce null).
 * La sua funzione è puramente logica: attivare il calcolo Proof of Work in background
 * non appena viene montato, e comunicare il risultato al componente padre tramite callback.
 */
const RerCapWidget: React.FC<RerCapWidgetProps> = ({
  endpoint,
  onSolve,
  onError,
  onProgress,
  onReset,
  workerCount,
}) => {
  // solvingRef: impedisce l'avvio di calcoli multipli contemporanei nello stesso componente
  const solvingRef = useRef<boolean>(false);

  // solvedRef: garantisce che il calcolo venga eseguito una sola volta per ciclo di vita (mount)
  const solvedRef = useRef<boolean>(false);

  // capInstanceRef: memorizza l'istanza della classe Cap per poterla pulire o resettare al distacco (unmount)
  const capInstanceRef = useRef<Cap | null>(null);

  // suppressResetRef: evita di propagare a onReset i reset che generiamo noi
  // stessi durante il cleanup (altrimenti chi rimonta il widget su onReset
  // entrerebbe in un loop infinito di calcoli)
  const suppressResetRef = useRef<boolean>(false);

  // Pattern "latest ref" per le callback: i consumatori le passano come arrow
  // function inline (nuova identità a ogni render). Se fossero dipendenze
  // dell'effect principale, ogni re-render del padre smonterebbe l'istanza Cap
  // (cleanup → reset()), cancellando il timer di scadenza del token appena
  // armato: il refresh automatico alla scadenza non scatterebbe mai.
  const onSolveRef = useRef(onSolve);
  const onErrorRef = useRef(onError);
  const onProgressRef = useRef(onProgress);
  const onResetRef = useRef(onReset);
  useEffect(() => {
    onSolveRef.current = onSolve;
    onErrorRef.current = onError;
    onProgressRef.current = onProgress;
    onResetRef.current = onReset;
  });

  useEffect(() => {
    // Il calcolo deve avvenire solo nel browser (lato client)
    if (typeof window === 'undefined') return;

    // Condizioni per l'avvio: non deve essere già in corso, né già risolto, e l'endpoint deve esistere
    if (!solvingRef.current && !solvedRef.current && endpoint) {
      solvingRef.current = true;

      try {
        // Preparazione della configurazione secondo le specifiche della libreria core
        const config: CapConfig = {
          apiEndpoint: endpoint,
          'data-cap-worker-count': workerCount?.toString(),
        };

        // Inizializzazione dell'istanza CAP (Motore invisibile)
        const cap = new Cap(config);
        capInstanceRef.current = cap;

        /**
         * Registrazione degli Event Listener.
         * La libreria Cap emette eventi custom per il progresso e il reset.
         */
        cap.addEventListener('progress', (e: CapProgressEvent) => {
          onProgressRef.current?.(e.detail.progress);
        });

        // L'evento 'reset' viene emesso da Cap anche alla scadenza del token
        // (timer interno sulla base di resp.expires): lo propaghiamo al padre
        // che può così richiedere un token nuovo
        cap.addEventListener('reset', () => {
          if (suppressResetRef.current) return;
          onResetRef.current?.();
        });

        /**
         * Metodo .solve(): Avvia effettivamente i WebWorkers e il calcolo SHA-256.
         * Restituisce una Promise che si risolve con il token finale.
         */
        cap
          .solve()
          .then((result) => {
            if (result.success) {
              solvedRef.current = true;
              onSolveRef.current(result.token); // Comunico il successo al componente padre
            } else {
              onErrorRef.current?.(
                'Verifica captcha fallita (Risposta API negativa)',
              );
            }
          })
          .catch((err: Error) => {
            // eslint-disable-next-line no-console
            console.error('RerCapWidget - Errore durante solve():', err);
            onErrorRef.current?.(
              err?.message || 'Errore tecnico durante il calcolo del captcha',
            );
          })
          .finally(() => {
            // Rilascio il lock di esecuzione
            solvingRef.current = false;
          });
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('RerCapWidget - Errore critico inizializzazione:', err);
        solvingRef.current = false;
        onErrorRef.current?.(
          err?.message || 'Impossibile inizializzare il motore captcha PoW',
        );
      }
    }

    /**
     * Funzione di Cleanup (Smontaggio).
     * Se l'utente cambia pagina o chiude il form mentre il calcolo è in corso,
     * fermiamo i WebWorkers per non sprecare risorse della CPU.
     */
    return () => {
      if (capInstanceRef.current) {
        // reset() ferma i worker e pulisce lo stato interno dell'istanza.
        // Sopprimiamo l'evento 'reset' generato da questa chiamata: non è una
        // scadenza del token ma un cleanup nostro
        suppressResetRef.current = true;
        capInstanceRef.current.reset();
        suppressResetRef.current = false;
      }
    };
    // Le callback sono volutamente escluse dalle dipendenze (vedi refs sopra):
    // l'istanza Cap deve vivere per tutta la vita del componente, non essere
    // ricreata a ogni re-render del padre
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, workerCount]);

  // Il componente è invisibile, non produce HTML
  return null;
};

/* 
  =============================================================================
  NOTA ARCHITETTURALE (SSR & Webpack):
  L'importazione diretta 'import Cap from ...' è sicura in Volto perché 
  l'inizializzazione avviene all'interno dello useEffect (che gira solo sul client).
  Se il bundler dovesse dare errori in fase di compilazione server-side,
  utilizzare l'import dinamico asincrono: import('@cap.js/widget').then(...)
  =============================================================================
*/

export default RerCapWidget;
