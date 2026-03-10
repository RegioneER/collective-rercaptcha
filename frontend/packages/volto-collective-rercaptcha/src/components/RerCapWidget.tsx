import React, { useEffect, useRef } from 'react';
import { useSelector, type DefaultRootState } from 'react-redux';
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

interface Data {
  '@components': {
    'rercaptcha-data': {
      '@id': string;
      'captcha-url': string;
    };
  };
}

interface State extends DefaultRootState {
  content: {
    data: Data;
  };
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
  const rerCaptchaData =
    useSelector(
      (state: State) =>
        state.content?.data?.['@components']?.['rercaptcha-data'],
    ) || null;

  if (!rerCaptchaData) {
    console.warn(
      'RerCapWidget - Dati rercaptcha non disponibili nel Redux store',
    );
    return null; // Se i dati non sono disponibili, non faccio nulla
  }

  console.log(rerCaptchaData);
  // solvingRef: impedisce l'avvio di calcoli multipli contemporanei nello stesso componente
  const solvingRef = useRef<boolean>(false);

  // solvedRef: garantisce che il calcolo venga eseguito una sola volta per ciclo di vita (mount)
  const solvedRef = useRef<boolean>(false);

  // capInstanceRef: memorizza l'istanza della classe Cap per poterla pulire o resettare al distacco (unmount)
  const capInstanceRef = useRef<Cap | null>(null);

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
        if (onProgress) {
          cap.addEventListener('progress', (e: CapProgressEvent) => {
            onProgress(e.detail.progress);
          });
        }

        if (onReset) {
          cap.addEventListener('reset', () => {
            onReset?.();
          });
        }

        /**
         * Metodo .solve(): Avvia effettivamente i WebWorkers e il calcolo SHA-256.
         * Restituisce una Promise che si risolve con il token finale.
         */
        cap
          .solve()
          .then((result) => {
            if (result.success) {
              solvedRef.current = true;
              onSolve(result.token); // Comunico il successo al componente padre
            } else {
              onError?.('Verifica captcha fallita (Risposta API negativa)');
            }
          })
          .catch((err: Error) => {
            console.error('RerCapWidget - Errore durante solve():', err);
            onError?.(
              err?.message || 'Errore tecnico durante il calcolo del captcha',
            );
          })
          .finally(() => {
            // Rilascio il lock di esecuzione
            solvingRef.current = false;
          });
      } catch (err: any) {
        console.error('RerCapWidget - Errore critico inizializzazione:', err);
        solvingRef.current = false;
        onError?.(
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
        // reset() ferma i worker e pulisce lo stato interno dell'istanza
        capInstanceRef.current.reset();
      }
    };
  }, [endpoint, workerCount, onSolve, onError, onProgress, onReset]);

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
