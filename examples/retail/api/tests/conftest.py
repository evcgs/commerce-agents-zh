# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

import pytest

# These suites assert the upstream English fixtures and copy (titles, option values,
# search rankings over English text). Pin the process to English before any module
# import builds a backend or agent — the default runtime locale is zh, and the bilingual
# layer would otherwise change what the assertions see.
from demo_common.locale import set_locale

set_locale("en")

from demo_common.tests.fixtures import *  # noqa: F403
from retail.api import main as main_module
from retail.api.agent_config import build_merchant_config
from retail.api.merchant import IDENTITY, create_merchant_router
from retail.api.mock_merchant import MockRetailMerchant
from retail.api.mock_retail import MockRetail


@pytest.fixture(scope="session")
def main():
    return main_module


@pytest.fixture(scope="session")
def make_storefront():
    return MockRetail


@pytest.fixture
def merchant(backend) -> MockRetailMerchant:
    return MockRetailMerchant(backend, build_merchant_config("ACME"))


@pytest.fixture(scope="session")
def merchant_identity():
    return IDENTITY


@pytest.fixture(scope="session")
def make_merchant_router():
    # create_merchant_router also returns the backend it serves (the locale route reloads
    # it); the shared contract tests want just the router, so unpack here.
    def _make(storefront, memory_store):
        router, _merchant, _agents = create_merchant_router(storefront, memory_store)
        return router

    return _make


@pytest.fixture(scope="session")
def extra_public_routes() -> set[str]:
    # commerce-agents-zh: the demo-remote fake third-party catalog (read-only, for the
    # connector's remote-adapter demo; ?fail=1 injects an outage).
    return {"/api/demo-remote/products", "/api/demo-remote/policies", "/api/demo-remote/health"}


@pytest.fixture(scope="session")
def restockable_listing() -> str:
    return "AR-1601"


@pytest.fixture(scope="session")
def cart_product() -> str:
    return "AR-1301"


@pytest.fixture(scope="session")
def relevance_probe() -> tuple[str, str, str, set[str]]:
    """Returns (query, non-relevance sort, product that must lead, faint matches that must be cut)."""
    return ("sleeping bag camping", "rating", "AR-1203", {"AR-2003", "AR-1507"})


@pytest.fixture(scope="session")
def showcase_stamps() -> set[str]:
    return {"low_stock"}
