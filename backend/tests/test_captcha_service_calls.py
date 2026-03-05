import pytest
from plone.restapi.testing import RelativeSession
from plone import api
from collective.rercaptcha.controlpanels.controlpanel import IRerCaptchaSettings
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

    assert response.status_code == 403
    assert (
        response.json().get("message")
        == "POST requests must provide 'capjs-token'. Please contact us if we are wrong."
    )


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
