import type { ConfigType } from '@plone/registry';
import installSettings from './config/settings';
import { RerCapWidget } from './components';
import { CaptchaTestView, CaptchaTestEdit } from './components/Blocks';
import worldSVG from '@plone/volto/icons/world.svg';

function applyConfig(config: ConfigType) {
  installSettings(config);

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
