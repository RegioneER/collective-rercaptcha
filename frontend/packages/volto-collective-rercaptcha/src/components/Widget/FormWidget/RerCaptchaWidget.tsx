/**
 * RerCaptchaWidget component.
 * @module components/manage/Widgets/RerCaptchaWidget
 */

// eslint-disable-next-line import/no-unresolved
import RerCapWidget from '@regioneer/volto-collective-rercaptcha/components/Widget/CapJsWidget';
// eslint-disable-next-line import/no-unresolved
import CaptchaPendingFeedback, {
  type CaptchaPendingFeedbackVariant,
  // eslint-disable-next-line import/no-unresolved
} from '@regioneer/volto-collective-rercaptcha/components/Widget/CaptchaPendingFeedback';
// eslint-disable-next-line import/no-unresolved
import { useRerCaptchaData } from '@regioneer/volto-collective-rercaptcha/hooks/useRerCaptchaShowButton';
import {
  useRerCaptchaEngine,
  type CaptchaTokenValue,
  type RerCaptchaEngineHandle,
} from './useRerCaptchaEngine';
import CaptchaCheckControl from './CaptchaCheckControl';
import type { MutableRefObject, Ref } from 'react';

interface RerCaptchaWidgetProps {
  id: string;
  /** Ref condivisa col resto del form (es. Captcha.jsx del Blocco Form):
   * opzionale, non tutti i chiamanti la passano (vedi useRerCaptchaEngine). */
  captchaToken?: MutableRefObject<CaptchaTokenValue | null>;
  /** Se passata, il widget esce dalla modalità legacy (eager al mount) ed
   * espone execute()/reset() al chiamante. */
  captchaRef?: Ref<RerCaptchaEngineHandle>;
  onChangeFormData: (
    id: string,
    field: string,
    value: string,
    extra: { label: string },
  ) => void;
  /** Errore di validazione Volto (es. campo obbligatorio), non il dettaglio
   * tecnico di un fallimento del calcolo (quello va in un toast). */
  errorMessage?: string;
  pendingFeedbackVariant?: CaptchaPendingFeedbackVariant;
}

/**
 * RerCaptchaWidget: Wrapper per integrare il captcha PoW nei form di Volto.
 *
 * Due modalità, decise dal flag `show-button` esposto dal backend insieme
 * agli altri dati del captcha (`rercaptcha-data`):
 * - invisibile (default): il calcolo non parte da solo. Il chiamante lo
 *   avvia invocando `captchaRef.current.execute({ async: true })`,
 *   tipicamente al submit del form.
 * - bottone esplicito: viene mostrato un checkbox che l'utente deve
 *   cliccare; il form resta bloccato (token assente) finché non lo fa.
 *
 * Questo nuovo comportamento è attivo solo per chi passa la prop
 * `captchaRef` (oggi: Blocco Form, Customer Satisfaction, Newsletter). Chi
 * non la passa continua a ricevere il comportamento storico (calcolo
 * avviato subito al mount) — oggi solo il blocco demo `CaptchaTest`.
 *
 * La macchina a stati vera e propria vive in `useRerCaptchaEngine`, la
 * modalità bottone in `CaptchaCheckControl`: questo componente li assembla.
 */
const RerCaptchaWidget = ({
  id,
  captchaToken,
  captchaRef,
  onChangeFormData,
  errorMessage,
  pendingFeedbackVariant = 'inline',
}: RerCaptchaWidgetProps) => {
  const isLegacyMode = !captchaRef;

  const rerCaptchaData = useRerCaptchaData();
  const endpoint = rerCaptchaData?.['captcha-url'];
  const showCheckButton = !isLegacyMode && !!rerCaptchaData?.['show-button'];

  const {
    status,
    showPendingFeedback,
    generation,
    engineRef,
    handleSolve,
    handleError,
    execute,
    reset,
  } = useRerCaptchaEngine({
    id,
    endpoint,
    captchaToken,
    captchaRef,
    onChangeFormData,
  });

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
        // Il token è scaduto (Cap emette 'reset' alla scadenza di
        // resp.expires): riusiamo lo stesso reset() esposto al chiamante,
        // che rimette lo stato a idle, pulisce il token e rimonta il motore
        // per calcolarne uno nuovo.
        onReset={reset}
      />

      {showCheckButton && (
        <CaptchaCheckControl status={status} onExecute={() => execute()} />
      )}

      {/* Il feedback "ci sto mettendo più del previsto" ha senso solo in
          modalità invisibile: col bottone esplicito lo stato è già visibile
          sul bottone stesso. */}
      <CaptchaPendingFeedback
        active={!showCheckButton && showPendingFeedback}
        variant={pendingFeedbackVariant}
      />

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
