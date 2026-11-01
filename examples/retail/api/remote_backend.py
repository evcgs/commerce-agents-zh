# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
# commerce-agents-zh: the read-only remote catalog adapter (design slices S3). Product
# search, product details, and policy lookups forward to a remote REST catalog whose
# heterogeneous fields are mapped leniently onto the protocol types (missing fields take
# the protocol defaults, extra fields are dropped); every other path — cart, orders,
# preferences, fulfillment, disclosures — delegates to the in-process MockRetail it
# wraps, so the write path keeps its local gates and the demo data stays the backstop.
# Three consecutive remote failures trip the breaker: reads fall back to the local mock
# (business never stops) while a half-open probe of the remote /health every 30 seconds
# restores forwarding on the first success.

"""The remote-catalog ``StorefrontBackend``: reads from a REST endpoint, everything else
from the wrapped mock, with a failure-count circuit breaker in between."""

from __future__ import annotations

import time
from typing import Any

import httpx

from shopping_agent import (
    Cart,
    FulfillmentOption,
    Order,
    Policy,
    Product,
    ProductDetails,
    SearchFilters,
    ShoppingSessionContext,
    StorefrontBackend,
    UserPreferences,
)

from .mock_retail import MockRetail

# Breaker parameters: three consecutive remote failures open the circuit; while open,
# one half-open probe every 30 seconds, reopening on the first success.
FAILURE_THRESHOLD = 3
PROBE_INTERVAL_S = 30.0


# ---- Lenient mapping: remote JSON -> protocol types ----------------------------------


def _records_of(data: Any, *keys: str) -> list[dict[str, Any]]:
    """The record list in a remote payload: a bare list, or under a conventional key."""
    if isinstance(data, list):
        return [record for record in data if isinstance(record, dict)]
    if isinstance(data, dict):
        for key in (*keys, "items", "results", "data"):
            value = data.get(key)
            if isinstance(value, list):
                return [record for record in value if isinstance(record, dict)]
    return []


def _text(raw: dict[str, Any], *keys: str) -> str | None:
    """The first non-blank string among the field aliases."""
    for key in keys:
        value = raw.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _as_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _str_dict(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    return {
        str(key): str(item)
        for key, item in value.items()
        if isinstance(item, (str, int, float, bool))
    }


def _map_product(raw: dict[str, Any]) -> Product | None:
    """One remote record as a protocol ``Product``, or None when even the identity
    fields (an id and a title) are missing — those have no protocol default."""
    product_id = _text(raw, "sku", "product_id", "id")
    title = _text(raw, "item_name", "title", "name")
    if not product_id or not title:
        return None
    price = _as_float(raw.get("price"))
    if price is None:
        cents = _as_float(raw.get("price_cents"))
        price = cents / 100 if cents is not None else 0.0
    rating = _as_float(raw.get("rating"))
    if rating is not None and not 0 <= rating <= 5:
        rating = None
    review_count = _as_float(raw.get("review_count"))
    tags = (
        [str(tag) for tag in raw.get("category_tags")]
        if isinstance(raw.get("category_tags"), list)
        else []
    )
    stock = _as_float(raw.get("stock_count"))
    return Product(
        product_id=product_id,
        title=title,
        brand=_text(raw, "brand_name", "brand"),
        price=price,
        currency=_text(raw, "currency") or "USD",
        rating=rating,
        review_count=int(review_count) if review_count is not None else None,
        image_url=_text(raw, "image_url", "image"),
        category=_text(raw, "category") or (tags[0] if tags else None),
        labels=tags,
        attributes=_str_dict(raw.get("attributes")),
        in_stock=True if stock is None else stock > 0,
        short_description=_text(raw, "short_description", "blurb"),
    )


def _map_policy(raw: dict[str, Any]) -> Policy | None:
    policy_id = _text(raw, "policy_id", "id")
    title = _text(raw, "title", "name")
    content = _text(raw, "content", "body", "text")
    if not policy_id or not title or not content:
        return None
    return Policy(
        policy_id=policy_id, title=title, category=_text(raw, "category"), content=content
    )


class RemoteCatalogBackend(StorefrontBackend):
    """Reads the catalog and the policies from ``{base_url}``, everything else through
    the wrapped MockRetail. The breaker counters are plain attributes so the connector
    sheet can show them: ``reads``, ``failures``, ``degraded``, ``fallback_active``."""

    def __init__(self, mock: MockRetail, conn: dict[str, Any]) -> None:
        self._mock = mock
        self._base_url = str(conn.get("base_url") or "").strip().rstrip("/")
        self._api_key = str(conn.get("api_key") or "")
        try:
            self._timeout_s = float(conn.get("timeout_s") or 5.0)
        except (TypeError, ValueError):
            self._timeout_s = 5.0
        self._client: httpx.AsyncClient | None = None
        self._last_probe_at = 0.0
        self.reads = 0
        self.failures = 0
        # No base URL configured: the adapter starts degraded and serves the mock.
        self.degraded = not self._base_url
        self.fallback_active = self.degraded

    # -- plumbing ------------------------------------------------------------------

    @property
    def mock(self) -> MockRetail:
        return self._mock

    def _headers(self) -> dict[str, str]:
        return {"X-API-Key": self._api_key} if self._api_key else {}

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self._timeout_s)
        return self._client

    def _record_success(self) -> None:
        self.failures = 0

    def _record_failure(self) -> None:
        self.failures += 1
        if self.failures >= FAILURE_THRESHOLD:
            self.degraded = True
            self.fallback_active = True
            self._last_probe_at = time.monotonic()

    async def _probe(self) -> None:
        """The half-open state: once per interval while degraded, try the remote health
        path; a success reopens the circuit and reads forward again."""
        now = time.monotonic()
        if now - self._last_probe_at < PROBE_INTERVAL_S:
            return
        self._last_probe_at = now
        try:
            response = await self._http().get(f"{self._base_url}/health", headers=self._headers())
            response.raise_for_status()
        except Exception:
            return
        self.degraded = False
        self.fallback_active = False
        self.failures = 0

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        """One remote GET. While degraded a fresh probe may reopen the circuit first;
        otherwise a degraded adapter refuses up front and the read falls back."""
        if self.degraded:
            await self._probe()
            if self.degraded:
                raise RuntimeError("remote catalog is degraded; serving local fixtures")
        try:
            response = await self._http().get(
                f"{self._base_url}{path}", params=params, headers=self._headers()
            )
            response.raise_for_status()
        except Exception:
            self._record_failure()
            raise
        self._record_success()
        return response.json()

    # -- covered read paths: forward to the remote catalog ---------------------------

    async def search_products(
        self,
        session: ShoppingSessionContext,
        query: str,
        filters: SearchFilters | None = None,
        limit: int = 8,
    ) -> list[Product]:
        del filters  # P1: the remote catalog takes a text query only
        self.reads += 1
        try:
            data = await self._get("/products", params={"q": query} if query else None)
        except Exception:
            return await self._mock.search_products(session, query, None, limit)
        products = []
        for raw in _records_of(data, "products"):
            if product := _map_product(raw):
                products.append(product)
        return products[: max(1, limit)]

    async def get_product_details(
        self, session: ShoppingSessionContext, product_id: str
    ) -> ProductDetails | None:
        self.reads += 1
        try:
            data = await self._get("/products", params={"q": product_id})
        except Exception:
            return await self._mock.get_product_details(session, product_id)
        wanted = product_id.lower()
        for raw in _records_of(data, "products"):
            mapped = _map_product(raw)
            if mapped is None or mapped.product_id.lower() != wanted:
                continue
            return ProductDetails(
                **mapped.model_dump(),
                long_description=_text(raw, "long_description", "description", "details"),
                specs=_str_dict(raw.get("specs")),
            )
        return None

    async def search_policies(
        self, session: ShoppingSessionContext, query: str
    ) -> list[Policy]:
        self.reads += 1
        try:
            data = await self._get("/policies", params={"q": query} if query else None)
        except Exception:
            return await self._mock.search_policies(session, query)
        policies = [policy for raw in _records_of(data, "policies") if (policy := _map_policy(raw))]
        if query:
            tokens = [token for token in query.lower().split() if token]
            matched = [
                policy
                for policy in policies
                if any(token in f"{policy.title} {policy.content}".lower() for token in tokens)
            ]
            if matched:
                return matched
            # Nothing matched the tokens (a cross-language query, say): stay helpful
            # rather than empty-handed, and hand back the top of the remote list.
        return policies[:5]

    # -- everything else: delegate to the wrapped mock --------------------------------

    async def get_cart(self, session: ShoppingSessionContext) -> Cart:
        return await self._mock.get_cart(session)

    async def add_to_cart(
        self, session: ShoppingSessionContext, product_id: str, quantity: int
    ) -> Cart:
        return await self._mock.add_to_cart(session, product_id, quantity)

    async def update_cart_item(
        self, session: ShoppingSessionContext, product_id: str, quantity: int
    ) -> Cart:
        return await self._mock.update_cart_item(session, product_id, quantity)

    async def remove_from_cart(
        self, session: ShoppingSessionContext, product_id: str
    ) -> Cart:
        return await self._mock.remove_from_cart(session, product_id)

    async def get_preferences(self, session: ShoppingSessionContext) -> UserPreferences:
        return await self._mock.get_preferences(session)

    async def get_orders(
        self, session: ShoppingSessionContext, limit: int = 5
    ) -> list[Order]:
        return await self._mock.get_orders(session, limit)

    async def get_order(
        self, session: ShoppingSessionContext, order_id: str
    ) -> Order | None:
        return await self._mock.get_order(session, order_id)

    async def get_fulfillment_options(
        self, session: ShoppingSessionContext, product_ids: list[str]
    ) -> list[FulfillmentOption]:
        return await self._mock.get_fulfillment_options(session, product_ids)

    async def checkout_handoff(
        self, session: ShoppingSessionContext, cart: Cart
    ) -> list[Any]:
        return await self._mock.checkout_handoff(session, cart)

    async def get_account_context(
        self, session: ShoppingSessionContext
    ) -> dict[str, Any] | None:
        return await self._mock.get_account_context(session)

    async def get_disclosure(
        self, session: ShoppingSessionContext, product_id: str
    ) -> Any | None:
        return await self._mock.get_disclosure(session, product_id)

    # -- the DemoStorefront surface the shared routes and panels also read -----------

    @property
    def store_name(self) -> str:
        return self._mock.store_name

    @property
    def products(self) -> dict[str, ProductDetails]:
        return self._mock.products

    def product(self, product_id: str) -> ProductDetails | None:
        return self._mock.product(product_id)

    def recent_orders(self, limit: int = 6) -> list[Order]:
        return self._mock.recent_orders(limit)

    def reset_session(self, session_id: str) -> None:
        self._mock.reset_session(session_id)

    def price_intelligence(self, product_id: str) -> dict[str, Any] | None:
        return self._mock.price_intelligence(product_id)

    def review_aspects(self, product_id: str) -> dict[str, Any] | None:
        return self._mock.review_aspects(product_id)
