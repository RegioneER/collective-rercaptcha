import type { ConfigType } from '@plone/registry';
import installSettings from './config/settings';
import { RerCapWidget, RerCapField } from './components';
import { CaptchaTestView, CaptchaTestEdit } from './components/Blocks';
import worldSVG from '@plone/volto/icons/world.svg';

function applyConfig(config: ConfigType) {
  installSettings(config);

  // Registrazione del widget nel registro globale di Volto
  // Questo permette di usare 'rercaptcha' come widget in uno schema
  /* config.widgets.id.rercaptcha = RerCapField; */
  config.widgets.id.pow_captcha = RerCapField;

  // Integrazione con volto-form-block:
  // Aggiungiamo il tipo di campo "Captcha PoW" tra le opzioni disponibili nel blocco form.
  if (config.blocks.blocksConfig.form) {
    config.blocks.blocksConfig.form.additionalFields = [
      ...(config.blocks.blocksConfig.form.additionalFields || []),
      {
        id: 'pow_captcha',
        label: 'Captcha PoW (Invisibile)',
      },
    ];
  }

  config.blocks.blocksConfig.captchaTestBlock = {
    id: 'captchaTestBlock',
    title: 'Captcha Test Block',
    icon: worldSVG,
    group: 'common',
    view: CaptchaTestView,
    edit: CaptchaTestEdit,
    restricted: false,
    mostUsed: true,
    sidebarTab: 1,
    security: {
      addPermission: [],
      viewPermission: [],
    },
  };

  return config;
}

export { RerCapWidget };
export default applyConfig;
