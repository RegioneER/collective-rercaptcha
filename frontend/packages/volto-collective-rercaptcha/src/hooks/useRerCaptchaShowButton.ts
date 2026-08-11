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
}

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
