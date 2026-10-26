import type { ConfigType } from '@plone/registry';

export default function install(config: ConfigType) {
  // Don't set the language settings (isMultilingual, supportedLanguages,
  // defaultLanguage) here: they belong to the site and an add-on would
  // override them on every project using it.
  return config;
}
