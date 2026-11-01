# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
# Localization layer added by commerce-agents-zh (see commerce_common/locale.py for the
# implementation; this module re-exports it for the example hosts and their tests).

"""The demo layer's view of the bilingual copy helper: ``demo_common.t`` is
``commerce_common.locale.t``. Kept as its own module so verticals and tests can import
``demo_common.locale`` whatever the shared package re-exports."""

from commerce_common.locale import get_locale, normalize, set_locale, t

__all__ = ["get_locale", "normalize", "set_locale", "t"]
