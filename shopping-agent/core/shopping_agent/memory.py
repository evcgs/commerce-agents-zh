# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""The extraction prompt the shopping runtimes hand to ``commerce_common.memory``: what
the store may remember about one customer between visits. Both locales' renderings are
built at import; :func:`shopping_extraction_prompt` picks the active one, so a run-time
locale switch is honored when the runtime is built."""

from __future__ import annotations

from typing import Any

from commerce_common.locale import t
from commerce_common.memory import MEMORY_EXTRACTION_TEMPLATE, MEMORY_EXTRACTION_TEMPLATE_ZH

_EXTRACTION_ARGS = dict(
    keeper="a store or service",
    subject="one customer",
    occasions="visits",
    speaker="the customer",
    qualifies=(
        "a preference, a limit, or standing context the customer stated themselves: the "
        "seat or room they ask for, a size, a monthly ceiling for the household's lines, who "
        "usually travels with them, a material they avoid, a maker they keep coming back to."
    ),
    standalone_example=(
        '"under 90 a month" tells a future reader nothing, while "wants the family\'s three '
        'lines to stay under 90 a month in total" tells them everything'
    ),
    live_key_rule=(
        "Keep the customer's one live undertaking (a trip, a room, an event) as a single fact "
        'under the key "current_project", naming the occasion, who it is for, and its budget; '
        "a new undertaking replaces it."
    ),
    excluded=(
        "anything that came from listings, results, or the store's own terms; the mechanics of "
        "this visit (what they searched for or put in the cart); your own guesses; and "
        "health, financial, or identity details, unless the customer asked in so many words "
        "for one to be kept."
    ),
)

SHOPPING_MEMORY_EXTRACTION_PROMPT_EN = MEMORY_EXTRACTION_TEMPLATE.format(**_EXTRACTION_ARGS)
SHOPPING_MEMORY_EXTRACTION_PROMPT_ZH = MEMORY_EXTRACTION_TEMPLATE_ZH.format(**_EXTRACTION_ARGS)


def shopping_extraction_prompt() -> str:
    """The shopping extraction prompt under the active locale."""
    return t(SHOPPING_MEMORY_EXTRACTION_PROMPT_EN, SHOPPING_MEMORY_EXTRACTION_PROMPT_ZH)


def __getattr__(name: str) -> Any:
    # SHOPPING_MEMORY_EXTRACTION_PROMPT stays importable, now resolved per access
    # (PEP 562) so it follows a run-time locale switch instead of the locale at
    # import time.
    if name == "SHOPPING_MEMORY_EXTRACTION_PROMPT":
        return shopping_extraction_prompt()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
