from collective.rercaptcha.testing import ACCEPTANCE_TESTING
from collective.rercaptcha.testing import FUNCTIONAL_TESTING
from collective.rercaptcha.testing import INTEGRATION_TESTING
from pytest_plone import fixtures_factory
import pytest
from plone import api
from collective.rercaptcha.controlpanels.controlpanel import IRerCaptchaSettings
import transaction


pytest_plugins = ["pytest_plone"]


globals().update(
    fixtures_factory(
        (
            (ACCEPTANCE_TESTING, "acceptance"),
            (FUNCTIONAL_TESTING, "functional"),
            (INTEGRATION_TESTING, "integration"),
        )
    )
)
