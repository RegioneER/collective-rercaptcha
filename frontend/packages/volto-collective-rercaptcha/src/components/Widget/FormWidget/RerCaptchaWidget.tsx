/**
 * RerCaptchaWidget component.
 * @module components/manage/Widgets/RerCaptchaWidget
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSelector, type DefaultRootState } from 'react-redux';
import RerCapWidget from 'volto-collective-rercaptcha/components/Widget/CapJsWidget';
import { useIntl, defineMessages } from 'react-intl';

const messages = defineMessages({
  captchaError: {
    id: 'rercaptcha_error',
    defaultMessage: 'Errore nella verifica del captcha',
  },
});

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
 * RerCaptchaWidget: Wrapper per integrare il captcha PoW nei form di Volto.
 * Implementa forwardRef per permettere il reset manuale dall'esterno.
 */
const RerCaptchaWidget = (props) => {
  const { id, captchaToken, onChangeFormData, errorMessage } = props;
  const rerCaptchaData =
    useSelector(
      (state: State) =>
        state.content?.data?.['@components']?.['rercaptcha-data'],
    ) || null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSolving, setIsSolving] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const intl = useIntl();

  // Garantisce che l'inizializzazione del campo avvenga una sola volta al mount
  const initializedRef = useRef(false);

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

      // Segnaliamo a Volto che il campo è inizialmente vuoto

      onChangeFormData(id, id, '', { label: id });
    }
  }, [id, captchaToken, onChangeFormData]);

  if (!rerCaptchaData) {
    // eslint-disable-next-line no-console
    console.warn(
      'RerCapWidget - Dati rercaptcha non disponibili nel Redux store',
    );
    return null;
  }

  return (
    <div className="rercap-widget-container" id={`field-${id}`}>
      <RerCapWidget
        endpoint={endpoint}
        onProgress={(p) => setProgress(p)}
        onSolve={(value) => {
          setIsSolving(false);
          setError(null);

          // Sblocchiamo il form impostando il token nel ref
          if (captchaToken) {
            captchaToken.current = createToken(id, value);
          }

          // Aggiorniamo il valore nel payload del form
          onChangeFormData(id, id, value, { label: id });
        }}
        onError={(err) => {
          setIsSolving(false);
          setError(err);
          if (captchaToken) {
            captchaToken.current = null;
          }
        }}
      />

      {/* Messaggio di stato durante il calcolo */}
      {/*       {isSolving && (
        <div
          className="rercap-status-info"
          style={{
            fontSize: '0.9em',
            color: '#666',
            marginTop: '5px',
            fontStyle: 'italic',
          }}
        >
          Verifica di sicurezza in corso: {Math.round(progress)}%
        </div>
      )} */}

      {/* Messaggi di errore (tecnici o di validazione Volto) */}
      {(error || errorMessage) && (
        <div
          className="rercap-error-info"
          style={{ fontSize: '0.9em', color: '#db2828', marginTop: '5px' }}
        >
          {error
            ? `${intl.formatMessage(messages.captchaError)}: ${error}`
            : errorMessage}
        </div>
      )}
    </div>
  );
};

export default RerCaptchaWidget;
