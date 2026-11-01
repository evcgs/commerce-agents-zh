// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/** Retail-specific labels on top of web-shared's formatters. */

import { formatDayMonth, formatMoney, formatNumber, plural, type RecordRowData, t, titleCase } from "web-shared";
import { ORDER_STATUS } from "./kinds";
import type { RecentOrder } from "./types";

const CATEGORY_LABELS: Record<string, string> = {
  "beauty-personal-care": t("Beauty & personal care", "美妆个护"),
  fitness: t("Fitness", "运动健身"),
  "furniture-bedroom": t("Furniture & bedroom", "家具卧室"),
  grocery: t("Grocery", "食品杂货"),
  "home-kitchen": t("Home & kitchen", "家居厨房"),
  "kids-room": t("Kids' room", "儿童房"),
  "office-electronics": t("Office & electronics", "办公电子"),
  "outdoor-camping": t("Outdoor & camping", "户外露营"),
  "pet-supplies": t("Pet supplies", "宠物用品"),
  "toys-games": t("Toys & games", "玩具桌游"),
  travel: t("Travel", "旅行出行"),
};

export function formatCategoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? titleCase(slug.replaceAll("-", "_"));
}

export function orderRows(orders: RecentOrder[]): RecordRowData[] {
  return orders.map((order) => ({
    id: order.order_id,
    detail: t(plural(order.items, "item"), `${formatNumber(order.items)} 件商品`),
    sub: `${formatDayMonth(order.placed_at)} · ${formatMoney(order.total)}`,
    status: ORDER_STATUS[order.status] ?? { label: order.status.replaceAll("_", " "), tone: "muted" },
  }));
}
