/**
 * RerCaptchaWidget component.
 * @module components/manage/Widgets/RerCaptchaWidget
 */

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useSelector, type DefaultRootState } from 'react-redux';
import { toast } from 'react-toastify';
import { Loader } from 'semantic-ui-react';
// eslint-disable-next-line import/no-unresolved
import RerCapWidget, {
  type RerCapWidgetHandle,
  // eslint-disable-next-line import/no-unresolved
} from '@regioneer/volto-collective-rercaptcha/components/Widget/CapJsWidget';
// eslint-disable-next-line import/no-unresolved
import CaptchaPendingFeedback, {
  type CaptchaPendingFeedbackVariant,
  // eslint-disable-next-line import/no-unresolved
} from '@regioneer/volto-collective-rercaptcha/components/Widget/CaptchaPendingFeedback';
import { useIntl, defineMessages } from 'react-intl';

const messages = defineMessages({
  captchaError: {
    id: 'rercaptcha_error',
    defaultMessage: 'Errore nella verifica del captcha',
  },
  checkButtonIdle: {
    id: 'rercaptcha_check_button_idle',
    defaultMessage: 'Verifica di non essere un robot',
  },
  checkButtonSolving: {
    id: 'rercaptcha_check_button_solving',
    defaultMessage: 'Verifica in corso…',
  },
  checkButtonSolved: {
    id: 'rercaptcha_check_button_solved',
    defaultMessage: 'Verifica completata',
  },
  checkButtonError: {
    id: 'rercaptcha_check_button_error',
    defaultMessage: 'Verifica fallita',
  },
  checkButtonRetry: {
    id: 'rercaptcha_check_button_retry',
    defaultMessage: 'Riprova',
  },
});

// Dopo quanti ms di attesa mostrare il feedback "ci sto mettendo più del
// previsto" nella modalità invisibile: evita che lampeggi nel caso comune,
// in cui il solve dura pochi millisecondi.
const PENDING_FEEDBACK_DELAY_MS = 600;

interface Data {
  '@components': {
    'rercaptcha-data': {
      '@id': string;
      'captcha-url': string;
      // NB: nome/valore provvisori. La chiave definitiva per il flag
      // "mostra il bottone di verifica esplicito" verrà decisa dal team
      // backend: isolata qui in un solo punto per poterla rinominare senza
      // toccare il resto del componente.
      'show-button'?: boolean;
    };
  };
}

interface State extends DefaultRootState {
  content: {
    data: Data;
  };
}

const getShowCheckButton = (rerCaptchaData: any): boolean =>
  !!rerCaptchaData?.['show-button'];

type CaptchaStatus = 'idle' | 'solving' | 'solved' | 'error';

interface PendingCallback {
  resolve: (value: string) => void;
  reject: (err: Error) => void;
}

/**
 * RerCaptchaWidget: Wrapper per integrare il captcha PoW nei form di Volto.
 *
 * Due modalità, decise dal flag `show-button` esposto dal backend insieme
 * agli altri dati del captcha (`rercaptcha-data`):
 * - invisibile (default): il calcolo non parte da solo. Il chiamante lo
 *   avvia invocando `captchaRef.current.execute({ async: true })`,
 *   tipicamente al submit del form.
 * - bottone esplicito: viene mostrato un bottone "Verifica" che l'utente
 *   deve cliccare; il form resta bloccato (token assente) finché non lo fa.
 *
 * Questo nuovo comportamento è attivo solo per chi passa la prop
 * `captchaRef` (oggi: il blocco Form). Chi non la passa continua a ricevere
 * il comportamento storico (calcolo avviato subito al mount), per non
 * introdurre regressioni nei punti di integrazione non ancora aggiornati.
 */
const RerCaptchaWidget = (props) => {
  const {
    id,
    captchaToken,
    captchaRef,
    onChangeFormData,
    errorMessage,
    pendingFeedbackVariant = 'inline' as CaptchaPendingFeedbackVariant,
  } = props;

  const isLegacyMode = !captchaRef;

  const rerCaptchaData =
    useSelector(
      (state: State) =>
        state.content?.data?.['@components']?.['rercaptcha-data'],
    ) || null;

  const showCheckButton = !isLegacyMode && getShowCheckButton(rerCaptchaData);

  const [status, setStatus] = useState<CaptchaStatus>('idle');
  const [showPendingFeedback, setShowPendingFeedback] = useState(false);
  // generation: usato come key di RerCapWidget per rimontarlo (e quindi
  // poter calcolare un token nuovo) dopo un reset esplicito del chiamante
  // (es. dopo un submit andato a buon fine: i token cap.js sono monouso)
  const [generation, setGeneration] = useState(0);
  const intl = useIntl();

  // Garantisce che l'inizializzazione del campo avvenga una sola volta al mount
  const initializedRef = useRef(false);
  const engineRef = useRef<RerCapWidgetHandle>(null);
  const pendingCallbacksRef = useRef<PendingCallback[]>([]);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Endpoint API
  const endpoint = rerCaptchaData?.['captcha-url'];

  /**
   * Formatta il token per il backend di Plone.
   */
  const createToken = (id, value) => {
    const token = {
      id: id,
      value: value,
    };
    return token;
  };

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

      // Sblocchiamo il form impostando il token nel ref
      if (captchaToken) {
        captchaToken.current = createToken(id, value);
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
      // ricalcoliamo nulla.
      if (captchaToken?.current) {
        return isAsync
          ? Promise.resolve(captchaToken.current.value)
          : undefined;
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

      return new Promise<string>((resolve, reject) => {
        pendingCallbacksRef.current.push({ resolve, reject });
        if (status === 'idle' || status === 'error') runEngine();
      });
    },
    [captchaToken, status, runEngine, endpoint],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    clearPendingFeedback();
    if (captchaToken) {
      captchaToken.current = null;
    }
    onChangeFormData(id, id, '', { label: id });
    // Il motore precedente ha già consumato la sua unica soluzione: ne
    // serve un'istanza nuova per calcolarne un'altra.
    setGeneration((g) => g + 1);
  }, [captchaToken, id, onChangeFormData, clearPendingFeedback]);

  useImperativeHandle(captchaRef, () => ({ execute, reset }), [execute, reset]);

  if (!rerCaptchaData) {
    // eslint-disable-next-line no-console
    console.warn(
      'RerCapWidget - Dati rercaptcha non disponibili nel Redux store',
    );
    return null;
  }

  return (
    <div
      className="rercap-widget-container"
      id={`field-${id}`}
      // In modalità bottone il widget deve poter stare in linea accanto al
      // bottone di submit (posizionamento gestito da chi lo consuma), con
      // un minimo di distanza da esso.
      style={
        showCheckButton
          ? { display: 'inline-flex', marginLeft: '0.75em' }
          : undefined
      }
    >
      <RerCapWidget
        key={generation}
        ref={engineRef}
        endpoint={endpoint}
        autoStart={isLegacyMode}
        onSolve={handleSolve}
        onError={handleError}
      />

      {showCheckButton && (
        <span
          className="rercap-check-widget"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}
        >
          {status === 'solved' ? (
            <span
              className="rercap-check-success"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4em',
              }}
            >
              <span
                aria-hidden="true"
                style={{ color: '#21ba45', fontWeight: 'bold' }}
              >
                ✓
              </span>
              {intl.formatMessage(messages.checkButtonSolved)}
            </span>
          ) : status === 'error' ? (
            <span
              className="rercap-check-error"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4em',
              }}
            >
              <span
                aria-hidden="true"
                style={{ color: '#db2828', fontWeight: 'bold' }}
              >
                ✕
              </span>
              {intl.formatMessage(messages.checkButtonError)}
              <button
                type="button"
                className="rercap-check-retry"
                onClick={() => execute()}
                aria-label={intl.formatMessage(messages.checkButtonRetry)}
                title={intl.formatMessage(messages.checkButtonRetry)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '1.6em',
                  height: '1.6em',
                  padding: 0,
                  borderRadius: '50%',
                  border: '1px solid #db2828',
                  background: 'transparent',
                  color: '#db2828',
                  cursor: 'pointer',
                  fontSize: '1em',
                  lineHeight: 1,
                }}
              >
                <span aria-hidden="true">↻</span>
              </button>
            </span>
          ) : (
            <label
              className="rercap-check-checkbox"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4em',
              }}
            >
              <input
                type="checkbox"
                checked={status === 'solving'}
                disabled={status === 'solving'}
                onChange={() => execute()}
              />
              {status === 'solving' && <Loader active inline size="tiny" />}
              {intl.formatMessage(
                status === 'solving'
                  ? messages.checkButtonSolving
                  : messages.checkButtonIdle,
              )}
            </label>
          )}
        </span>
      )}

      {/* Il feedback "ci sto mettendo più del previsto" ha senso solo in
          modalità invisibile: col bottone esplicito lo stato è già visibile
          sul bottone stesso. */}
      <CaptchaPendingFeedback
        active={!showCheckButton && showPendingFeedback}
        variant={pendingFeedbackVariant}
      />

      {/* Errore di validazione Volto (es. campo captcha obbligatorio): gli
          errori tecnici del calcolo (rete, servizio non raggiungibile...)
          vanno solo nel toast, per non duplicare quanto già comunicato da
          "Verifica fallita" in modalità bottone. */}
      {errorMessage && (
        <div
          className="rercap-error-info"
          style={{ fontSize: '0.9em', color: '#db2828', marginTop: '5px' }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default RerCaptchaWidget;
