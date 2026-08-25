import React from 'react';
import ReactDOM from 'react-dom';
import { Loader } from 'semantic-ui-react';
import { useIntl, defineMessages } from 'react-intl';

const messages = defineMessages({
  verifying: {
    id: 'rercaptcha_verifying',
    defaultMessage: 'Attendi, stiamo verificando che tu sia umano…',
  },
});

export type CaptchaPendingFeedbackVariant = 'inline' | 'overlay';

interface CaptchaPendingFeedbackProps {
  /** Se false il componente non renderizza nulla. */
  active: boolean;
  /**
   * 'inline': una scritta con una piccola rotella accanto al bottone di submit.
   * 'overlay': la pagina si scurisce con un messaggio in sovraimpressione,
   * come nelle azioni massive sui contenuti di Volto.
   */
  variant?: CaptchaPendingFeedbackVariant;
  message?: string;
}

/**
 * CaptchaPendingFeedback: feedback mostrato all'utente quando la verifica
 * invisibile (avviata al submit) impiega più del previsto. Non è pensato per
 * la modalità con bottone esplicito, che ha già un proprio indicatore sul
 * bottone stesso.
 */
const CaptchaPendingFeedback: React.FC<CaptchaPendingFeedbackProps> = ({
  active,
  variant = 'inline',
  message,
}) => {
  const intl = useIntl();

  if (!active) return null;

  const text = message ?? intl.formatMessage(messages.verifying);

  if (variant === 'overlay') {
    if (typeof document === 'undefined') return null;

    return ReactDOM.createPortal(
      <div
        className="rercap-pending-overlay"
        role="alert"
        aria-live="assertive"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          zIndex: 10000,
          color: '#fff',
        }}
      >
        <Loader active inverted size="large" />
        <span>{text}</span>
      </div>,
      document.body,
    );
  }

  return (
    <div
      className="rercap-pending-inline"
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5em',
        fontSize: '0.9em',
        color: '#666',
        marginTop: '5px',
      }}
    >
      <Loader active inline size="tiny" />
      <span>{text}</span>
    </div>
  );
};

export default CaptchaPendingFeedback;
