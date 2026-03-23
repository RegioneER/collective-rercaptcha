from collective.rercaptcha.eventsubscribers import is_captcha_enabled
from collective.rercaptcha.eventsubscribers import is_valid_rercaptcha_token
from collective.volto.formsupport import _
from collective.volto.formsupport.captcha import CaptchaSupport
from zExceptions import BadRequest
from zope.i18n import translate


class RercaptchaSupport(CaptchaSupport):
    name = _("Rercaptcha Support")

    def isEnabled(self):
        """to
        Rercaptcha is enabled with registry vars
        """
        return is_captcha_enabled()

    def serialize(self):
        if not is_captcha_enabled():
            return {}

        return {"provider": "recaptcha"}

    def verify(self, data):
        token = data["token"]["value"] if "token" in data else None

        if not is_valid_rercaptcha_token(token):
            raise BadRequest(
                translate(
                    _("The code you entered was wrong, please enter the new one."),
                    context=self.request,
                )
            )
