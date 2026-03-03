from collective.rercaptcha import _
from zExceptions import Forbidden
from zope.globalrequest import getRequest
from zope.i18n import translate

import logging
import os
import requests


def get_environment_variable(variable_name, variable_desired_type=str):
    """Utility that retrieve the value of an environment variable.
    If the variable is not defined or is not of the desired type an error is thrown."""

    value = os.environ.get(variable_name)

    if value is None:
        msg = translate(
            _(
                "missing_environ_variable",
                default=f"The environment variable'{variable_name}' is missing"
                "Please contact us if we are wrong.",
            ),
            context=getRequest(),
        )
        raise Forbidden(msg)

    if variable_desired_type is str:
        return str(value)

    if variable_desired_type is int:
        try:
            value = int(value)
        except ValueError:
            msg = translate(
                _(
                    "not_int_environ_variable",
                    default="The environment variable is not castable at int"
                    "Please contact us if we are wrong.",
                ),
                context=getRequest(),
            )
            raise Forbidden(msg) from None
        return value

    if variable_desired_type is bool:
        if value == "False" or value == "false" or value == 0:
            return False
        if value == "True" or value == "true" or value == 1:
            return True
        msg = translate(
            _(
                "not_bool_environ_variable",
                default="The ambient variable is not a boolean value"
                "Please contact us if we are wrong.",
            ),
            context=getRequest(),
        )
        raise Forbidden(msg)

    return value


def pre_traverse_check(obj, event):
    """Function that checks if requests satisfy the requirement of the captcha.

    Requests are blocked if:
    - are POST requests that does not contain the 'capjs-token' in the form fields.
    - are POST requests containing the 'capjs-token' but are rejected by the capjs
      service.

    This function needs some environment variables:
    - USE_RER_CAPTCHA: a boolean value that enables the checks
    - CAPJS_INTERNAL_URL: the url of the capjs service (ex. http://capjs:3000)
    - CAPJS_SITE_KEY e CAPJS_SECRET: ???
    - CAPTCHA_ENABLED_ACTIONS: a list of ruote actions where the captcha check is active
    """

    # only POST requests are checked
    if getattr(event.request, "REQUEST_METHOD", "") != "POST":
        return

    # obtain environment variables
    USE_RER_CAPTCHA = get_environment_variable("USE_RER_CAPTCHA", str)
    CAPJS_INTERNAL_URL = get_environment_variable("CAPJS_INTERNAL_URL", str)
    CAPJS_SITE_KEY = get_environment_variable("SITE_KEY", str)
    CAPJS_SECRET = get_environment_variable("SECRET_KEY", str)
    whitelisted_routes = get_environment_variable("CAPTCHA_ENABLED_ACTIONS", str)

    # CAPTCHA checks must be enabled
    if USE_RER_CAPTCHA is False:
        return

    whitelisted_routes = set(
        whitelisted_routes.strip().replace(",", " ").replace("@", " ").split()
    )

    # check if the action is not in the whitelisted routes
    action = event.request.get("ACTUAL_URL").split("/")[-1].lstrip("@")
    if action not in whitelisted_routes:
        return

    token = event.request.form.get("capjs-token")
    if not token:
        msg = translate(
            _(
                "no_capjs_token",
                default="POST requests must provide 'capjs-token'"
                "Please contact us if we are wrong.",
            ),
            context=getRequest(),
        )
        raise Forbidden(msg)

    res = requests.post(
        f"{CAPJS_INTERNAL_URL}/{CAPJS_SITE_KEY}/siteverify",
        data={"secret": CAPJS_SECRET, "response": token},
        timeout=5,
    )
    if not res:
        msg = translate(
            _(
                "rer_capcha_error",
                default="Error in the captcha service response"
                "Please contact us if we are wrong.",
            ),
            context=getRequest(),
        )
        raise Forbidden(msg)

    try:
        result = res.json()
    except requests.exceptions.JSONDecodeError:
        logging.exception(
            "%s %s, %s", res.url, {"secret": CAPJS_SECRET, "response": token}, res.text
        )
        result = {}

    # accepted request
    if result.get("success"):
        return

    # rejected request, blocked
    msg = translate(
        _(
            "rer_capcha_failed",
            default="Captcha service rejected the request"
            "Please contact us if we are wrong.",
        ),
        context=getRequest(),
    )
    raise Forbidden(msg)
