import { Loader } from 'semantic-ui-react';
import { useIntl, defineMessages } from 'react-intl';
import type { CaptchaStatus } from './useRerCaptchaEngine';

const messages = defineMessages({
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

const rowStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4em',
} as const;

interface CaptchaCheckControlProps {
  status: CaptchaStatus;
  /** Avvia (o rilancia, in caso di errore) il calcolo. */
  onExecute: () => void;
}

/**
 * Modalità bottone esplicito: checkbox (idle/solving) → spunta verde
 * (solved) → X rossa + bottone "Riprova" (error). Icone come semplici
 * simboli Unicode con colore inline, non componenti `Icon` di
 * semantic-ui-react: quell'icona dipende da un font/CSS che nel tema
 * pubblico (Bootstrap Italia) non risulta caricato, quindi resterebbe
 * invisibile — `Loader` invece va bene (puro CSS, nessun font).
 */
const CaptchaCheckControl = ({
  status,
  onExecute,
}: CaptchaCheckControlProps) => {
  const intl = useIntl();

  if (status === 'solved') {
    return (
      <span className="rercap-check-success" style={rowStyle}>
        <span
          aria-hidden="true"
          style={{ color: '#21ba45', fontWeight: 'bold' }}
        >
          ✓
        </span>
        {intl.formatMessage(messages.checkButtonSolved)}
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="rercap-check-error" style={rowStyle}>
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
          onClick={onExecute}
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
    );
  }

  return (
    <label className="rercap-check-checkbox" style={rowStyle}>
      <input
        type="checkbox"
        checked={status === 'solving'}
        disabled={status === 'solving'}
        onChange={onExecute}
      />
      {status === 'solving' && <Loader active inline size="tiny" />}
      {intl.formatMessage(
        status === 'solving'
          ? messages.checkButtonSolving
          : messages.checkButtonIdle,
      )}
    </label>
  );
};

export default CaptchaCheckControl;
