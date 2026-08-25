import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type MutableRefObject,
  type Ref,
} from 'react';
import { toast } from 'react-toastify';
import { useIntl, defineMessages } from 'react-intl';
// eslint-disable-next-line import/no-unresolved
import type { RerCapWidgetHandle } from '@regioneer/volto-collective-rercaptcha/components/Widget/CapJsWidget';

const messages = defineMessages({
  captchaError: {
    id: 'rercaptcha_error',
    defaultMessage: 'Errore nella verifica del captcha',
  },
});

// Dopo quanti ms di attesa mostrare il feedback "ci sto mettendo più del
// previsto" nella modalità invisibile: evita che lampeggi nel caso comune,
// in cui il solve dura pochi millisecondi.
const PENDING_FEEDBACK_DELAY_MS = 600;

export type CaptchaStatus = 'idle' | 'solving' | 'solved' | 'error';

export interface CaptchaTokenValue {
  id: string;
  value: string;
}

export interface RerCaptchaEngineHandle {
  execute: (opts?: {
    async?: boolean;
  }) => Promise<string | undefined> | undefined;
  reset: () => void;
}

interface PendingCallback {
  resolve: (value: string | undefined) => void;
  reject: (err: Error) => void;
}

interface UseRerCaptchaEngineOptions {
  id: string;
  endpoint?: string;
  captchaToken?: MutableRefObject<CaptchaTokenValue | null>;
  captchaRef?: Ref<RerCaptchaEngineHandle>;
  onChangeFormData: (
    id: string,
    field: string,
    value: string,
    extra: { label: string },
  ) => void;
}

interface UseRerCaptchaEngineResult extends RerCaptchaEngineHandle {
  status: CaptchaStatus;
  showPendingFeedback: boolean;
  generation: number;
  engineRef: MutableRefObject<RerCapWidgetHandle | null>;
  handleSolve: (value: string) => void;
  handleError: (err: string) => void;
}

/**
 * Macchina a stati del captcha PoW, separata dalla presentazione.
 *
 * Gestisce: lo stato (idle/solving/solved/error), la coda di chiamate
 * `execute({ async: true })` in attesa che il calcolo finisca, il rimonto
 * del motore di basso livello (`generation`, i token cap.js sono monouso) e
 * l'esposizione dell'API imperativa (`execute`/`reset`) a `captchaRef`.
 */
export function useRerCaptchaEngine({
  id,
  endpoint,
  captchaToken,
  captchaRef,
  onChangeFormData,
}: UseRerCaptchaEngineOptions): UseRerCaptchaEngineResult {
  const intl = useIntl();

  const [status, setStatus] = useState<CaptchaStatus>('idle');
  const [showPendingFeedback, setShowPendingFeedback] = useState(false);
  // generation: usato come key di RerCapWidget per rimontarlo (e quindi
  // poter calcolare un token nuovo) dopo un reset esplicito del chiamante
  // (es. dopo un submit andato a buon fine, o alla scadenza del token: i
  // token cap.js sono monouso)
  const [generation, setGeneration] = useState(0);

  // Garantisce che l'inizializzazione del campo avvenga una sola volta al mount
  const initializedRef = useRef(false);
  const engineRef = useRef<RerCapWidgetHandle>(null);
  const pendingCallbacksRef = useRef<PendingCallback[]>([]);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  // Traccia il token risolto indipendentemente dal captchaToken esterno
  // (opzionale, non tutti i chiamanti lo passano): serve a execute() per
  // riconoscere "già risolto" anche quando quel ref non c'è, es. quando il
  // bottone esplicito ha già completato la verifica e il chiamante invoca
  // execute() di nuovo al submit.
  const solvedTokenRef = useRef<string | null>(null);

  /**
   * Effetto di inizializzazione al montaggio del componente.
   */
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;

      // Resettiamo il token per forzare la validazione fallita all'avvio
      if (captchaToken) {
        captchaToken.current = null;
      }

      onChangeFormData(id, id, '', { label: id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, captchaToken, onChangeFormData]);

  useEffect(() => {
    return () => clearTimeout(pendingTimerRef.current);
  }, []);

  const clearPendingFeedback = useCallback(() => {
    clearTimeout(pendingTimerRef.current);
    setShowPendingFeedback(false);
  }, []);

  const settlePending = useCallback((fn: (cb: PendingCallback) => void) => {
    const callbacks = pendingCallbacksRef.current;
    pendingCallbacksRef.current = [];
    callbacks.forEach(fn);
  }, []);

  const handleSolve = useCallback(
    (value: string) => {
      setStatus('solved');
      clearPendingFeedback();
      solvedTokenRef.current = value;

      // Sblocchiamo il form impostando il token nel ref
      if (captchaToken) {
        captchaToken.current = { id, value };
      }

      // Aggiorniamo il valore nel payload del form
      onChangeFormData(id, id, value, { label: id });

      settlePending((cb) => cb.resolve(value));
    },
    [captchaToken, id, onChangeFormData, clearPendingFeedback, settlePending],
  );

  const handleError = useCallback(
    (err: string) => {
      setStatus('error');
      clearPendingFeedback();
      solvedTokenRef.current = null;

      if (captchaToken) {
        captchaToken.current = null;
      }

      // Il dettaglio tecnico va solo nel toast: a schermo, vicino al
      // captcha, basta lo stato sintetico ("Verifica fallita").
      toast.error(`${intl.formatMessage(messages.captchaError)}: ${err}`);

      settlePending((cb) => cb.reject(new Error(err)));
    },
    [captchaToken, clearPendingFeedback, settlePending, intl],
  );

  const runEngine = useCallback(() => {
    setStatus('solving');
    clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = setTimeout(
      () => setShowPendingFeedback(true),
      PENDING_FEEDBACK_DELAY_MS,
    );
    engineRef.current?.execute();
  }, []);

  /**
   * API imperativa esposta a chi consuma il widget (es. Captcha.jsx del
   * blocco Form). `execute({ async: true })` rispecchia il contratto già
   * usato da hcaptcha_invisible in volto-form-block.
   */
  const execute = useCallback(
    ({ async: isAsync }: { async?: boolean } = {}) => {
      // Token già presente (bottone esplicito già cliccato, o solve già
      // completato in precedenza): i token cap.js sono monouso, non
      // ricalcoliamo nulla. Controlliamo sia il captchaToken esterno (se il
      // chiamante lo passa, es. il blocco Form) sia il ref interno (sempre
      // valorizzato, per i chiamanti che non lo passano): senza
      // quest'ultimo, richiamare execute() dopo che il bottone esplicito ha
      // già risolto — tipicamente al submit — metterebbe in coda una nuova
      // Promise che non verrebbe mai saldata, perché il motore non riparte
      // (status non è più idle/error) e nessun onSolve/onError arriva più.
      if (captchaToken?.current) {
        return isAsync
          ? Promise.resolve(captchaToken.current.value)
          : undefined;
      }
      if (solvedTokenRef.current) {
        return isAsync ? Promise.resolve(solvedTokenRef.current) : undefined;
      }

      // Nessun endpoint (captcha non attivo/non configurato): non c'è nulla
      // da calcolare. Risolviamo subito invece di lasciare la Promise
      // appesa per sempre in attesa di un onSolve/onError che non arriverà
      // mai (il motore rifiuterebbe comunque di partire senza endpoint).
      if (!endpoint) {
        return isAsync ? Promise.resolve(undefined) : undefined;
      }

      if (!isAsync) {
        if (status === 'idle' || status === 'error') runEngine();
        return undefined;
      }

      return new Promise<string | undefined>((resolve, reject) => {
        pendingCallbacksRef.current.push({ resolve, reject });
        if (status === 'idle' || status === 'error') runEngine();
      });
    },
    [captchaToken, status, runEngine, endpoint],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    clearPendingFeedback();
    solvedTokenRef.current = null;
    if (captchaToken) {
      captchaToken.current = null;
    }
    onChangeFormData(id, id, '', { label: id });
    // Il motore precedente ha già consumato la sua unica soluzione: ne
    // serve un'istanza nuova per calcolarne un'altra.
    setGeneration((g) => g + 1);
  }, [captchaToken, id, onChangeFormData, clearPendingFeedback]);

  useImperativeHandle(captchaRef, () => ({ execute, reset }), [execute, reset]);

  return {
    status,
    showPendingFeedback,
    generation,
    engineRef,
    handleSolve,
    handleError,
    execute,
    reset,
  };
}
