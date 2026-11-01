// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { t } from "./i18n";

const TOOL_COPY: Record<string, string> = {
  search_products: t("Searching the catalog…", "正在搜索商品目录…"),
  get_product_details: t("Reading the details…", "正在查看商品详情…"),
  search_policies: t("Checking the policies…", "正在查询政策条款…"),
  get_orders: t("Looking up your orders…", "正在查询你的订单…"),
  get_order_status: t("Looking up your orders…", "正在查询你的订单…"),
  get_fulfillment_options: t("Checking delivery and pickup options…", "正在查看配送与自提选项…"),
  get_cart: t("Checking the cart…", "正在查看购物车…"),
  add_to_cart: t("Updating the cart…", "正在更新购物车…"),
  update_cart_item: t("Updating the cart…", "正在更新购物车…"),
  remove_from_cart: t("Updating the cart…", "正在更新购物车…"),
  checkout: t("Preparing your order summary…", "正在准备订单摘要…"),
  get_preferences: t("Reading your profile…", "正在读取你的偏好…"),
  recall_memories: t("Recalling what you've told me…", "正在回忆你告诉过我的…"),
  save_memory: t("Saving that for next time…", "正在保存，下次还记得…"),
  load_skill: t("Loading…", "正在加载…"),
  web_search: t("Searching the web…", "正在搜索网络…"),
  get_business_snapshot: t("Reading the business snapshot…", "正在读取经营概览…"),
  query_metrics: t("Querying metrics…", "正在查询指标…"),
  search_listings: t("Searching the listings…", "正在搜索商品列表…"),
  get_listing: t("Reading the listing…", "正在查看商品…"),
  get_inventory_alerts: t("Checking inventory alerts…", "正在检查库存预警…"),
  get_order_issues: t("Checking order issues…", "正在检查订单问题…"),
  get_pricing_context: t("Reading the pricing context…", "正在读取定价背景…"),
  get_campaign_performance: t("Reading campaign performance…", "正在读取活动表现…"),
  get_pending_changes: t("Checking pending changes…", "正在检查待处理变更…"),
  run_analysis: t("Running the analysis…", "正在进行分析…"),
  apply_change: t("Applying the change…", "正在应用变更…"),
  discard_change: t("Discarding the change…", "正在放弃变更…"),
};

const QUERY_TOOLS = new Set([
  "search_products",
  "search_policies",
  "search_listings",
  "web_search",
]);

export function describeToolCall(tool: string, input: Record<string, unknown> = {}): string {
  const copy = TOOL_COPY[tool];
  const query = typeof input.query === "string" ? input.query.trim() : "";
  if (copy && query && QUERY_TOOLS.has(tool)) {
    return `${copy.replace(/…$/, "")} · “${query}”`;
  }
  if (copy) return copy;
  if (tool.startsWith("present_")) return t("Composing the answer…", "正在组织回答…");
  if (tool.startsWith("stage_")) return t("Staging a change for review…", "正在暂存变更以待审核…");
  return `${tool.replaceAll("_", " ")}…`;
}
