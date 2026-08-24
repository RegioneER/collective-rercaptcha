import { useSelector, type DefaultRootState } from 'react-redux';

/**
 * Dati esposti dal backend insieme al captcha, via l'expander
 * `rercaptcha-data` (`collective.rercaptcha.expanders.RerCaptchaExpander`).
 */
export interface RerCaptchaData {
  '@id': string;
  'captcha-url': string;
  /** Se true, il captcha mostra un bottone di verifica esplicito invece di
   * calcolare il token in automatico al submit. Campo di registro
   * `show_button` in `IRerCaptchaSettings`. */
  'show-button'?: boolean;
  /** Le REST action (es. `@feedback-add`) per cui il backend
   * (`pre_traverse_check`) pretende e valida un `capjs-token`. Campo di
   * registro `whitelisted_routes` in `IRerCaptchaSettings` ("Azioni
   * controllate" nel pannello di controllo). Stessa lista usata dal
   * frontend per decidere se attivare il captcha in Customer Satisfaction e
   * Newsletter (il Blocco Form resta indipendente, ha il proprio campo
   * "Captcha provider"). */
  'whitelisted-routes'?: string[];
}

// Stessa normalizzazione di `pre_traverse_check` (eventsubscribers.py) lato
// backend: toglie `@` e `,` ovunque nella stringa, non solo all'inizio,
// perché l'admin può scriverle nel pannello di controllo in punti diversi.
const normalizeAction = (action: string): string =>
  action.trim().replace(/[,@]/g, '');

interface State extends DefaultRootState {
  content: {
    data: {
      '@components': {
        'rercaptcha-data'?: RerCaptchaData;
      };
    };
  };
}

/**
 * Legge i dati di `rercaptcha-data` dal content corrente. `null` se il
 * captcha non è attivo/configurato per questa route (l'expander backend non
 * li espone in quel caso).
 */
export const useRerCaptchaData = (): RerCaptchaData | null =>
  useSelector(
    (state: State) => state.content?.data?.['@components']?.['rercaptcha-data'],
  ) || null;

/**
 * True se il captcha deve mostrare il bottone di verifica esplicito invece
 * della modalità invisibile (di default). Unico punto che legge il flag
 * `show-button`: usato sia da `RerCaptchaWidget` sia da chi lo consuma
 * (Blocco Form, Customer Satisfaction, Newsletter) per decidere se
 * pre-bloccare il proprio bottone di submit finché la verifica non è
 * completa.
 */
export const useRerCaptchaShowButton = (): boolean => {
  const rerCaptchaData = useRerCaptchaData();
  return !!rerCaptchaData?.['show-button'];
};

/**
 * True se `action` (con o senza `@` iniziale, es. `feedback-add` o
 * `@feedback-add`) è presente in "Azioni controllate"
 * (`whitelisted_routes`). Usato da Customer Satisfaction e Newsletter per
 * decidere se attivare il captcha: a differenza del Blocco Form (che ha il
 * proprio campo "Captcha provider"), questi due non hanno un interruttore
 * dedicato e si affidano alla stessa lista che il backend usa per
 * l'enforcement, cioè la action deve essere esplicitamente aggiunta lì
 * perché il captcha si attivi.
 */
export const useRerCaptchaActionEnabled = (action: string): boolean => {
  const rerCaptchaData = useRerCaptchaData();
  const whitelistedRoutes = rerCaptchaData?.['whitelisted-routes'];
  if (!whitelistedRoutes?.length) return false;
  const target = normalizeAction(action);
  return whitelistedRoutes.some((route) => normalizeAction(route) === target);
};
