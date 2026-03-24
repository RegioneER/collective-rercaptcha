from collective.rercaptcha.controlpanels.controlpanel import IRerCaptchaSettings
from plone import api
from plone.restapi.testing import RelativeSession

import pytest
import requests_mock
import transaction


@pytest.mark.functional
def test_request_without_token(functional):

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

    response = client.post("/@querystring-search")

    assert response.status_code == 400
    assert response.json().get("message") == "Error: the captcha token was not found."


@pytest.mark.functional
def test_non_post_request(functional):

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

    response = client.get("/@querystring-search")

    assert response.status_code == 400
    assert response.json().get("message") == "No query supplied"


@pytest.mark.functional
def test_token_validation_accepted(functional):

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

    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri(
            "POST",
            "http://mysite.com/xxxx/siteverify",
            json={"success": True},
            status_code=200,
        )

        response = client.post(
            "/@querystring-search",
            json={"capjs-token": "abcdefg"},
        )

        assert response.status_code == 400
        assert response.json().get("message") == "No query supplied"


@pytest.mark.functional
def test_token_validation_rejected(functional):

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

    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri(
            "POST",
            "http://mysite.com/xxxx/siteverify",
            json={},
            status_code=200,
        )

        response = client.post(
            "/@querystring-search",
            json={"capjs-token": "abcdefg"},
        )

        assert response.status_code == 403
        assert (
            response.json().get("message")
            == "Captcha service rejected the request. Please contact us if we are wrong."
        )


@pytest.mark.functional
def test_disabled_captcha(functional):

    portal = functional["portal"]
    client = RelativeSession(portal.absolute_url())
    client.headers.update({"Accept": "application/json"})

    api.portal.set_registry_record(
        interface=IRerCaptchaSettings, name="use_captcha", value=False
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

    response = client.post("/@querystring-search")

    assert response.status_code == 400
    assert response.json().get("message") == "No query supplied"


@pytest.mark.functional
def test_request_not_on_whitelisted_route(functional):

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
        value=["http://other.url"],
    )

    transaction.commit()

    response = client.post("/@querystring-search")

    assert response.status_code == 400
    assert response.json().get("message") == "No query supplied"
