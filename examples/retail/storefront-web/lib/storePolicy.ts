// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/** Copied from ../data/policies.json; keep in sync with it. */
import { t } from "web-shared";

export const STORE_POLICY = {
  returnsShort: t("30-day returns", "30 天可退换"),
  returnsLine: t(
    "Most items can be returned within 30 days of delivery for a refund to your original payment method.",
    "大部分商品自送达之日起 30 天内可退货，退款将退回原支付方式。",
  ),
  freeShippingThreshold: 49,
  standardShippingEta: t("3–5 business days", "3–5 个工作日"),
} as const;
