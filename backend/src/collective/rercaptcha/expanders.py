from plone.restapi.interfaces import IExpandableElement
from zope.component import adapter
from zope.interface import implementer
from zope.publisher.interfaces.browser import IBrowserRequest
from plone.dexterity.interfaces import IDexterityContent
from plone import api
from collective.rercaptcha.controlpanels.controlpanel import IRerCaptchaSettings


@implementer(IExpandableElement)
@adapter(IDexterityContent, IBrowserRequest)
class RerCaptchaExpander:
    def __init__(self, context, request):
        self.context = context
        self.request = request

    def __call__(self, expand=False):

        captcha_uri = api.portal.get_registry_record(
            interface=IRerCaptchaSettings, name="captcha_uri"
        )
        captcha_site_key = api.portal.get_registry_record(
            interface=IRerCaptchaSettings, name="captcha_site_key"
        )
        return {
            "rercaptcha-data": {
                "@id": f"{self.context.absolute_url()}/@rercaptcha-data",
                "captcha-url": f"{captcha_uri}/{captcha_site_key}",
            }
        }
