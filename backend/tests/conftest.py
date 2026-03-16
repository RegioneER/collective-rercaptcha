from collective.rercaptcha.testing import (ACCEPTANCE_TESTING,
                                           FUNCTIONAL_TESTING,
                                           INTEGRATION_TESTING)
from pytest_plone import fixtures_factory

pytest_plugins = ["pytest_plone"]


globals().update(
    fixtures_factory((
        (ACCEPTANCE_TESTING, "acceptance"),
        (FUNCTIONAL_TESTING, "functional"),
        (INTEGRATION_TESTING, "integration"),
    ))
)
