import logging

import requests
from collective.rercaptcha import _
from collective.rercaptcha.controlpanels.controlpanel import IRerCaptchaSettings
from plone import api
from plone.restapi.deserializer import json_body
from plone.restapi.exceptions import DeserializationError
from zExceptions import BadRequest, Forbidden
from zope.globalrequest import getRequest
from zope.i18n import translate


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
    token = request["token"]["value"] if request["token"] else None

    if not token:
        try:
            token = json_body(request).get("capjs-token")
        except DeserializationError as err:
            raise BadRequest(str(err)) from None

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

    return token


def is_valid_rercaptcha(request):
    """Utility function to check if a request is accepted by the captcha service."""

    token = get_captcha_token(request)

    captcha_uri = api.portal.get_registry_record(
        interface=IRerCaptchaSettings, name="captcha_uri"
    )
    captcha_site_key = api.portal.get_registry_record(
        interface=IRerCaptchaSettings, name="captcha_site_key"
    )
    captcha_secret = api.portal.get_registry_record(
        interface=IRerCaptchaSettings, name="captcha_secret"
    )

    captcha_uri = captcha_uri.rstrip("/")

    result = requests.post(
        f"{captcha_uri}/{captcha_site_key}/siteverify",
        json={"secret": captcha_secret, "response": token},
        timeout=5,
    )

    breakpoint()
    result.raise_for_status()

    if not result:
        msg = translate(
            _(
                "rer_capcha_error",
                default="Error in the captcha service response. "
                "Please contact us if we are wrong.",
            ),
            context=getRequest(),
        )
        raise Forbidden(msg)

    captcha_secret = api.portal.get_registry_record(
        interface=IRerCaptchaSettings, name="captcha_secret"
    )
    if not captcha_secret:
        # if the registry is not properly configured, we do not block any request
        return True

    try:
        json_result = result.json()
    except requests.exceptions.JSONDecodeError:
        logging.exception(
            "%s %s, %s",
            result.url,
            {"secret": captcha_secret, "response": token},
            result.text,
        )
        json_result = {}

    return bool(json_result.get("success"))


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

    if event.request.method != "POST":
        # we only check POST requests
        return

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

    if not captcha_uri or not captcha_site_key or not captcha_secret:
        # if the registry is not properly configured, we do not block any request
        return

    if not whitelisted_routes:
        # if no whitelisted routes are set, we do not block any request
        return

    whitelisted_routes = {
        whitelisted_route.strip().replace(",", "").replace("@", "")
        for whitelisted_route in whitelisted_routes
    }

    # check if the action is not in the whitelisted routes
    action = event.request.get("ACTUAL_URL").split("/")[-1].lstrip("@")
    if action not in whitelisted_routes:
        return

    if not is_valid_rercaptcha(event):
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
