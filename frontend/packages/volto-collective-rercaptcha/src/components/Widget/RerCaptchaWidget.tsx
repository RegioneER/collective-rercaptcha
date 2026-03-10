/**
 * RerCaptchaWidget component.
 * @module components/manage/Widgets/RerCaptchaWidget
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSelector, type DefaultRootState } from 'react-redux';
import RerCapWidget from 'volto-collective-rercaptcha/components/RerCapWidget';

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
 * RerCaptchaWidget: Wrapper per integrare il captcha PoW (SHA-256) nei form di Volto.
 *
 * SCELTE TECNICHE:
 * 1. Integrazione con volto-form-block: Utilizza il sistema di validazione basato su ref
 *    (captchaToken) per bloccare il submit finché il calcolo non è completato.
 * 2. Gestione degli errori: Visualizza errorMessage passato da Volto per feedback di validazione.
 */
const RerCaptchaWidget = (props) => {
  const { id, captchaToken, onChangeFormData, errorMessage } = props;
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

  const [isSolving, setIsSolving] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  // Garantisce che l'inizializzazione del campo avvenga una sola volta al mount
  const initializedRef = useRef(false);

  // Endpoint API
  const endpoint = rerCaptchaData['captcha-url'];

  /**
   * Formatta il token per il backend di Plone.
   */
  const createToken = (id, value) => {
    return JSON.stringify({ id, value });
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
      setTimeout(() => {
        onChangeFormData(id, id, '', { label: id });
      }, 0);
    }
  }, [id, captchaToken, onChangeFormData]);

  return (
    <div className="rercap-widget-container" id={`field-${id}`}>
      {/* Motore invisibile PoW */}
      <RerCapWidget
        endpoint={endpoint}
        onProgress={(p) => setProgress(p)}
        onSolve={(t) => {
          setIsSolving(false);
          setError(null);

          // Sblocchiamo il form impostando il token nel ref
          if (captchaToken) {
            captchaToken.current = createToken(id, t);
          }

          // Aggiorniamo il valore nel payload del form
          onChangeFormData(id, id, t, { label: id });
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
      {isSolving && (
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
      )}

      {/* Messaggi di errore (tecnici o di validazione Volto) */}
      {(error || errorMessage) && (
        <div
          className="rercap-error-info"
          style={{ fontSize: '0.9em', color: '#db2828', marginTop: '5px' }}
        >
          {error ? `Errore tecnico: ${error}` : errorMessage}
        </div>
      )}
    </div>
  );
};

export default RerCaptchaWidget;
