from unittest.mock import MagicMock

import pytest
import transaction
from collective.rercaptcha.controlpanels.controlpanel import IRerCaptchaSettings
from collective.rercaptcha.expanders import RerCaptchaExpander
from plone import api
from plone.restapi.testing import RelativeSession


@pytest.mark.functional
def test_expander_with_full_data(functional):

    mock_context = MagicMock()
    mock_context.absolute_url.return_value = "http://mysite.com"
    mock_request = MagicMock()

    expander = RerCaptchaExpander(mock_context, mock_request)

    api.portal.set_registry_record(
        interface=IRerCaptchaSettings, name="use_captcha", value=True
    )
    api.portal.set_registry_record(
        interface=IRerCaptchaSettings, name="captcha_uri", value="http://mysite.com"
    )
    api.portal.set_registry_record(
        interface=IRerCaptchaSettings, name="captcha_site_key", value="xxxx"
    )
    api.portal.set_registry_record(
        interface=IRerCaptchaSettings, name="captcha_secret", value="yyyy"
    )
    api.portal.set_registry_record(
        interface=IRerCaptchaSettings,
        name="whitelisted_routes",
        value=["querystring-search"],
    )

    transaction.commit()

    result = expander(expand=True)

    assert "rercaptcha-data" in result
    assert "@id" in result["rercaptcha-data"]
    assert "captcha-url" in result["rercaptcha-data"]
    assert result["rercaptcha-data"]["captcha-url"] == "http://mysite.com/xxxx"


@pytest.mark.functional
def test_expander_with_api_request(functional):

    portal = functional["portal"]
    client = RelativeSession(portal.absolute_url())
    client.headers.update({"Accept": "application/json"})

    api.portal.set_registry_record(
        interface=IRerCaptchaSettings, name="use_captcha", value=True
    )
    api.portal.set_registry_record(
        interface=IRerCaptchaSettings, name="captcha_uri", value="http://mysite.com"
    )
    api.portal.set_registry_record(
        interface=IRerCaptchaSettings, name="captcha_site_key", value="xxxx"
    )
    api.portal.set_registry_record(
        interface=IRerCaptchaSettings, name="captcha_secret", value="yyyy"
    )
    api.portal.set_registry_record(
        interface=IRerCaptchaSettings,
        name="whitelisted_routes",
        value=["querystring-search"],
    )

    transaction.commit()

    response = client.get("/++api++")

    assert response.status_code == 200
    obj = response.json()

    assert "@components" in obj
    assert "rercaptcha-data" in obj["@components"]
    assert obj["@components"]["rercaptcha-data"]

    assert "@id" in obj["@components"]["rercaptcha-data"]
    assert "captcha-url" in obj["@components"]["rercaptcha-data"]
    assert (
        obj["@components"]["rercaptcha-data"]["captcha-url"] == "http://mysite.com/xxxx"
    )
