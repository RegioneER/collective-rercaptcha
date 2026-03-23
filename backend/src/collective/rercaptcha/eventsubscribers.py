import logging

import requests
from collective.rercaptcha import _
from collective.rercaptcha.controlpanels.controlpanel import IRerCaptchaSettings
from plone import api
from zExceptions import BadRequest, Forbidden
from zope.globalrequest import getRequest
from zope.i18n import translate
from requests.exceptions import HTTPError
from plone.restapi.exceptions import DeserializationError
from plone.restapi.deserializer import json_body


def is_captcha_enabled():
    """Checks if the captcha is enabled in the registry."""
    try:
        return api.portal.get_registry_record(
            interface=IRerCaptchaSettings, name="use_captcha", default=False
        )
    except KeyError:
        # This error can happen if the registry record is not set,
        # for example if the addon is not properly installed.
        return False


def get_captcha_token(request):
    """Gets the captcha token from the request."""
    token = request["token"]["value"] if request["token"] else None
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


def is_valid_rercaptcha_token(token):
    """Utility function to check if a token is accepted by the captcha service."""

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

    response = requests.post(
        f"{captcha_uri}/{captcha_site_key}/siteverify",
        data={"secret": captcha_secret, "response": token},
        timeout=5,
    )

    try:
        response.raise_for_status()
    except HTTPError as error:
        raise BadRequest(
            "Error in the response fron the captcha service "
            f"(status {response.status_code})"
        ) from error

    if response.status_code != 200:
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
        json_response = response.json()
    except requests.exceptions.JSONDecodeError:
        logging.exception(
            "%s %s, %s",
            response.url,
            {"secret": captcha_secret, "response": token},
            response.text,
        )
        json_response = {}

    return bool(json_response.get("success"))


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

    try:
        token = json_body(event.request).get("capjs-token")
    except DeserializationError as err:
        raise BadRequest(str(err)) from None

    if not token:
        raise BadRequest("Error: the captcha token was not found.")

    if not is_valid_rercaptcha_token(token):
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
