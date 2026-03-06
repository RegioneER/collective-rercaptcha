from zope import schema
from collective.rercaptcha import _
from plone.app.registry.browser import controlpanel
from plone.restapi.controlpanels.interfaces import IControlpanel


class IRerCaptchaSettings(IControlpanel):

    use_captcha = schema.Bool(
        title=_("use_captcha", default="Use Captcha"),
        description=_(
            "use_captcha_description",
            default="Whether to use the captcha service or not. If false, the captcha"
            "will be not used and the requests will not be blocked.",
        ),
        required=False,
        default=False,
    )

    captcha_uri = schema.URI(
        title=_("captcha_uri", default="Captcha URI"),
        description=_(
            "captcha_uri_description",
            default="The URI of the captcha service to use."
            "For example: https://www.google.com/recaptcha/api/siteverify",
        ),
        required=False,
    )

    captcha_site_key = schema.TextLine(
        title=_("captcha_site_key", default="Captcha Site Key"),
        description=_(
            "captcha_site_key_description",
            default="The site key of the captcha service to use.",
        ),
        required=False,
    )

    captcha_secret = schema.TextLine(
        title=_("captcha_secret", default="Captcha Secret"),
        description=_(
            "captcha_secret_description",
            default="The secret key of the captcha service to use.",
        ),
        required=False,
    )

    whitelisted_routes = schema.List(
        title=_("whitelisted_routes", default="Whitelisted Routes"),
        description=_(
            "whitelisted_routes_description",
            default="List of routes that are allowed to use the captcha service."
            "For example: @foo",
        ),
        required=False,
        value_type=schema.TextLine(),
    )


class RerCaptchaSettingsForm(controlpanel.RegistryEditForm):

    schema = IRerCaptchaSettings
    label = _("rercaptcha_settings_label", default="RerCaptcha Settings")
    description = _(
        "rercaptcha_settings_description", default="Manage RerCaptcha settings."
    )


class RerCaptchaSettingsControlPanel(controlpanel.ControlPanelFormWrapper):
    form = RerCaptchaSettingsForm
