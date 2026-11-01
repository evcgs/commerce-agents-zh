// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/** How each kind of retail record shows: its label, icon, and tone. */

import { t, type KindStyle, type Tone } from "web-shared";
import type { ChangeKind, InventoryAlert, ListingStatus, OrderIssue } from "./types";

export const ISSUE_KINDS: Record<OrderIssue["kind"], KindStyle> = {
  delayed: { label: t("Delayed", "配送延迟"), icon: "truck", tone: "warn" },
  return_spike: { label: t("Return spike", "退货激增"), icon: "return", tone: "danger" },
  buyer_message: { label: t("Buyer message", "买家留言"), icon: "message", tone: "info" },
  damaged: { label: t("Damaged", "货品破损"), icon: "alert", tone: "danger" },
};

export const INVENTORY_KINDS: Record<InventoryAlert["kind"], KindStyle> = {
  low_stock: { label: t("Low stock", "低库存"), icon: "low", tone: "warn" },
  slow_mover: { label: t("Slow mover", "滞销"), icon: "clock", tone: "muted" },
};

export const LISTING_STATUS: Record<ListingStatus, { label: string; tone: Tone }> = {
  active: { label: t("Active", "在售"), tone: "ok" },
  paused: { label: t("Paused", "已暂停"), tone: "muted" },
  draft: { label: t("Draft", "草稿"), tone: "info" },
  out_of_stock: { label: t("Out of stock", "缺货"), tone: "danger" },
};

export const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  processing: { label: t("Processing", "处理中"), tone: "muted" },
  shipped: { label: t("Shipped", "已发货"), tone: "info" },
  out_for_delivery: { label: t("Out for delivery", "配送中"), tone: "info" },
  delivered: { label: t("Delivered", "已送达"), tone: "ok" },
  delayed: { label: t("Delayed", "延迟"), tone: "warn" },
  cancelled: { label: t("Cancelled", "已取消"), tone: "muted" },
  return_initiated: { label: t("Return requested", "退货申请中"), tone: "violet" },
  refunded: { label: t("Refunded", "已退款"), tone: "ok" },
};

/** Change kinds as shown on change cards. */
export const CHANGE_KIND_LABELS: Record<ChangeKind, string> = {
  listing_update: t("Listing update", "商品更新"),
  price_update: t("Price update", "价格调整"),
  inventory_action: t("Inventory action", "库存操作"),
  promotion: t("Promotion", "促销"),
  campaign: t("Campaign", "活动"),
};
