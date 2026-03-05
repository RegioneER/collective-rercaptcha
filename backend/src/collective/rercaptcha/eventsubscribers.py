from collective.rercaptcha import _
from zExceptions import Forbidden
from zope.globalrequest import getRequest
from zope.i18n import translate
from plone import api
import logging
import requests
from collective.rercaptcha.controlpanels.controlpanel import IRerCaptchaSettings


def pre_traverse_check(obj, event):
    """Function that checks if requests satisfy the requirement of the captcha.

    Requests are blocked if:
    - are POST requests that does not contain the 'capjs-token' in the form fields.
    - are POST requests containing the 'capjs-token' but are rejected by the capjs
      service.

    This function needs some registry variables:
    - use_captcha: a boolean value that enables the checks
    - captcha_uri: the url of the capjs service (ex. http://capjs:3000)
    - captcha_site_key e captcha_secret: ???
    - whitelisted_routes: a list of routes where the captcha check is active
                          (last part of URLs, comma separated)
    """

    # only POST requests are checked
    if getattr(event.request, "REQUEST_METHOD", "") != "POST":
        return

    use_captcha = api.portal.get_registry_record(
        interface=IRerCaptchaSettings, name="use_captcha"
    )

    # CAPTCHA checks must be enabled
    if use_captcha is False:
        return

    captcha_uri = api.portal.get_registry_record(
        interface=IRerCaptchaSettings, name="captcha_uri"
    )
    captcha_site_key = api.portal.get_registry_record(
        interface=IRerCaptchaSettings, name="captcha_site_key"
    )
    captcha_secret = api.portal.get_registry_record(
        interface=IRerCaptchaSettings, name="captcha_secret"
    )
    whitelisted_routes = api.portal.get_registry_record(
        interface=IRerCaptchaSettings, name="whitelisted_routes"
    )

    whitelisted_routes = {
        whitelisted_route.strip().replace(",", "").replace("@", "")
        for whitelisted_route in whitelisted_routes
    }

    # check if the action is not in the whitelisted routes
    action = event.request.get("ACTUAL_URL").split("/")[-1].lstrip("@")
    if action not in whitelisted_routes:
        return

    token = event.request.form.get("capjs-token")
    if not token:
        msg = translate(
            _(
                "no_capjs_token",
                default="POST requests must provide 'capjs-token'. "
                "Please contact us if we are wrong.",
            ),
            context=getRequest(),
        )
        raise Forbidden(msg)

    res = requests.post(
        f"{captcha_uri}/{captcha_site_key}/siteverify",
        data={"secret": captcha_secret, "response": token},
        timeout=5,
    )
    if not res:
        msg = translate(
            _(
                "rer_capcha_error",
                default="Error in the captcha service response. "
                "Please contact us if we are wrong.",
            ),
            context=getRequest(),
        )
        raise Forbidden(msg)

    try:
        result = res.json()
    except requests.exceptions.JSONDecodeError:
        logging.exception(
            "%s %s, %s",
            res.url,
            {"secret": captcha_secret, "response": token},
            res.text,
        )
        result = {}

    # accepted request
    if result.get("success"):
        return

    # rejected request, blocked
    msg = translate(
        _(
            "rer_capcha_failed",
            default="Captcha service rejected the request. "
            "Please contact us if we are wrong.",
        ),
        context=getRequest(),
    )
    raise Forbidden(msg)
