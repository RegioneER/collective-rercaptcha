from collective.rercaptcha import _
from zExceptions import Forbidden
from zope.globalrequest import getRequest
from zope.i18n import translate
from plone import api
import logging
import requests
from collective.rercaptcha.controlpanels.controlpanel import IRerCaptchaSettings
from plone.restapi.deserializer import json_body
from plone.restapi.exceptions import DeserializationError
from zExceptions import BadRequest


def is_captcha_enabled():
    """Utility function to check if the captcha is enabled in the registry."""
    try:
        return api.portal.get_registry_record(
            interface=IRerCaptchaSettings, name="use_captcha", default=False
        )
    except KeyError:
        # This error can happen if the registry record is not set,
        # for example if the addon is not properly installed.
        return False


def get_captcha_token(request):
    """Utility function to get the captcha token from the request."""
    token = request.form.get("capjs-token")

    if not token:
        try:
            token = json_body(request).get("capjs-token")
        except DeserializationError as err:
            raise BadRequest(str(err)) from None

    return token


# def is_request_accepted_by_captcha(request):
#     try:
#         result = res.json()
#     except requests.exceptions.JSONDecodeError:
#         logging.exception(
#             "%s %s, %s",
#             res.url,
#             {"secret": captcha_secret, "response": token},
#             res.text,
#         )
#         result = {}

#     # accepted request
#     if result.get("success"):
# return


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

    # CAPTCHA checks must be enabled
    if not is_captcha_enabled():
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

    token = get_captcha_token(event.request)

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
