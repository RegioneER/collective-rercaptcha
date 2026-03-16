from collective.rercaptcha.controlpanels.controlpanel import \
    IRerCaptchaSettings
from collective.rercaptcha.interfaces import IBrowserLayer
from plone.restapi.controlpanels import RegistryConfigletPanel
from zope.component import adapter
from zope.interface import Interface, implementer


@adapter(Interface, IBrowserLayer)
@implementer(IRerCaptchaSettings)
class RerCaptchaSettingsControlpanel(RegistryConfigletPanel):
    schema = IRerCaptchaSettings
    configlet_id = "RerCaptchaSettings"
    configlet_category_id = "Products"
    schema_prefix = None
