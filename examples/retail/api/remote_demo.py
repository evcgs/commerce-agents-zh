# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""A simulated third-party product system for the retail example, backing the
"接入系统标准化" design slice S2: a deliberately heterogeneous catalog endpoint
(``sku``/``item_name``/``price_cents``/... instead of the storefront's local
``product_id``/``title``/``price`` fields) plus a policies feed and a health
probe, so a remote adapter can be exercised against realistic field mismatch.
Every route accepts ``?fail=1`` to return a 500 for outage/degradation demos.

This module exists purely for demos and integration tests; it is not a real
vendor API. In production deployments it should stay disabled (the main app can
gate mounting this router behind an environment variable such as
``DEMO_REMOTE_ENABLED``).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel


class DemoRemoteProduct(BaseModel):
    """One listing as this third-party system shaped it — field names and
    semantics intentionally differ from the local ``catalog.json``."""

    sku: str
    item_name: str
    brand_name: str
    price_cents: int
    category_tags: list[str]
    stock_count: int
    ships_from: str


class DemoRemotePolicy(BaseModel):
    id: str
    title: str
    body_md: str


class DemoRemoteProductList(BaseModel):
    products: list[DemoRemoteProduct]


class DemoRemotePolicyList(BaseModel):
    policies: list[DemoRemotePolicy]


class DemoRemoteHealth(BaseModel):
    status: str
    service: str


# Fictional vendors and items; none of these appear in the local catalog.
_DEMO_PRODUCTS: list[DemoRemoteProduct] = [
    DemoRemoteProduct(
        sku="NR-TENT-2P",
        item_name="NorthRim Ridgeline 2P Backpacking Tent",
        brand_name="NorthRim",
        price_cents=24900,
        category_tags=["outdoor", "camping", "shelter"],
        stock_count=34,
        ships_from="Reno, NV",
    ),
    DemoRemoteProduct(
        sku="NR-SLP-20",
        item_name="NorthRim Cirrus 20° Down Sleeping Bag",
        brand_name="NorthRim",
        price_cents=18900,
        category_tags=["outdoor", "camping", "sleep"],
        stock_count=12,
        ships_from="Reno, NV",
    ),
    DemoRemoteProduct(
        sku="HR-CAST-5Q",
        item_name="Hearthly Ember 5-Quart Cast Iron Dutch Oven",
        brand_name="Hearthly",
        price_cents=7450,
        category_tags=["home", "kitchen", "cookware"],
        stock_count=58,
        ships_from="Columbus, OH",
    ),
    DemoRemoteProduct(
        sku="HR-LAMP-01",
        item_name="Hearthly Fern Glass Table Lamp",
        brand_name="Hearthly",
        price_cents=5299,
        category_tags=["home", "lighting"],
        stock_count=7,
        ships_from="Columbus, OH",
    ),
    DemoRemoteProduct(
        sku="TP-FLSK-16",
        item_name="Trailpath Vacuum Flask 16oz Slate",
        brand_name="Trailpath",
        price_cents=3250,
        category_tags=["outdoor", "drinkware"],
        stock_count=140,
        ships_from="Portland, OR",
    ),
    DemoRemoteProduct(
        sku="TP-HIK-40L",
        item_name="Trailpath Granite 40L Hiking Pack",
        brand_name="Trailpath",
        price_cents=13500,
        category_tags=["outdoor", "hiking", "bags"],
        stock_count=23,
        ships_from="Portland, OR",
    ),
    DemoRemoteProduct(
        sku="CK-BRD-OAK",
        item_name="Copperkettle Oak End-Grain Cutting Board",
        brand_name="Copperkettle",
        price_cents=4600,
        category_tags=["home", "kitchen"],
        stock_count=81,
        ships_from="Asheville, NC",
    ),
    DemoRemoteProduct(
        sku="CK-URN-1L",
        item_name="Copperkettle Gooseneck Pour-Over Kettle 1L",
        brand_name="Copperkettle",
        price_cents=6800,
        category_tags=["home", "kitchen", "coffee"],
        stock_count=0,
        ships_from="Asheville, NC",
    ),
    DemoRemoteProduct(
        sku="SV-HAM-M",
        item_name="Solhaven Cotton Woven Throw Blanket",
        brand_name="Solhaven",
        price_cents=3900,
        category_tags=["home", "textiles"],
        stock_count=66,
        ships_from="Savannah, GA",
    ),
]

_DEMO_POLICIES: list[DemoRemotePolicy] = [
    DemoRemotePolicy(
        id="ship-standard",
        title="Shipping Policy",
        body_md=(
            "Orders leave the warehouse within 2 business days. Standard ground "
            "shipping is free over $50; otherwise a flat $4.99 applies. "
            "Oversized items (tents, packs over 30L) ship separately in 3-5 days."
        ),
    ),
    DemoRemotePolicy(
        id="returns-60d",
        title="Returns & Exchanges",
        body_md=(
            "Unused items may be returned within 60 days of delivery for a full "
            "refund to the original payment method. Clearance items marked "
            "`final-sale` are exchange-only. Return labels are prepaid; a $6 "
            "fee is deducted for non-defective large-item pickups."
        ),
    ),
    DemoRemotePolicy(
        id="warranty-2y",
        title="Warranty",
        body_md=(
            "All NorthRim and Trailpath gear carries a 2-year limited warranty "
            "against manufacturing defects, including zipper and seam failures. "
            "Hearthly cookware carries a lifetime warranty against casting "
            "defects; normal wear, rust from improper drying, and thermal shock "
            "are not covered."
        ),
    ),
]


def create_demo_remote_router() -> APIRouter:
    """Build the router that plays an external product system for adapter
    integration and fault-injection demos."""
    router = APIRouter(prefix="/api/demo-remote", tags=["demo-remote"])

    def _fail_requested(fail: str | None) -> bool:
        return fail == "1"

    @router.get("/products", response_model=DemoRemoteProductList)
    def list_products(
        q: str | None = Query(default=None, description="Substring filter on item_name/brand_name"),
        fail: str | None = Query(default=None),
    ) -> DemoRemoteProductList:
        if _fail_requested(fail):
            raise HTTPException(status_code=500, detail="simulated outage")
        needle = (q or "").strip().lower()
        products = [
            p
            for p in _DEMO_PRODUCTS
            if not needle or needle in p.item_name.lower() or needle in p.brand_name.lower()
        ]
        return DemoRemoteProductList(products=products)

    @router.get("/policies", response_model=DemoRemotePolicyList)
    def list_policies(fail: str | None = Query(default=None)) -> DemoRemotePolicyList:
        if _fail_requested(fail):
            raise HTTPException(status_code=500, detail="simulated outage")
        return DemoRemotePolicyList(policies=_DEMO_POLICIES)

    @router.get("/health", response_model=DemoRemoteHealth)
    def health(fail: str | None = Query(default=None)) -> DemoRemoteHealth:
        if _fail_requested(fail):
            raise HTTPException(status_code=500, detail="simulated outage")
        return DemoRemoteHealth(status="ok", service="demo-remote-catalog")

    return router
