// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

/** Copied from the retail merchant fixtures under data/. */

import { t } from "web-shared";
import type { ChangePreviewPayload, DigestPayload } from "./types";

const digest: DigestPayload = {
  title: t("Morning digest", "晨间简报"),
  items: [
    {
      kind: "low_stock",
      ref_id: "AR-2102",
      headline: t("3 units left of the ocean wall decals (AR-2102) — under two days of cover", "海洋主题墙贴（AR-2102）仅剩 3 件——库存撑不过两天"),
      why_it_matters: t("Selling roughly 52 units a month; at that pace the listing goes dark this week.", "月销约 52 件；按这个速度，本周内这款商品就会下架。"),
      listing: {
        listing_id: "AR-2102",
        title: t("ACME Kids Peel-and-Stick Ocean Wall Decals (36 pc)", "ACME 儿童海洋主题可撕贴墙贴（36 片装）"),
        status: "active",
        price: 24.0,
        stock: 3,
      },
    },
    {
      kind: "order_issue",
      ref_id: "AR-80417",
      headline: t("Six returns on the travel pillow this week, all citing firmness", "旅行枕本周出现 6 笔退货，理由都是偏硬"),
      why_it_matters: t("A return spike on a top seller usually means a listing-content gap.", "畅销品退货激增，通常是商品详情页内容有欠缺。"),
    },
    {
      kind: "metric",
      headline: t("Kids' room sales are up 21% week-over-week", "儿童房品类销售额环比上升 21%"),
      why_it_matters: t("Most of the lift traces to the under-the-sea decor line.", "增长主要来自海底主题装饰系列。"),
    },
  ],
};

const change_preview: ChangePreviewPayload = {
  change_id: "chg-3021",
  headline: t("Refill AR-2102 before it sells out", "在 AR-2102 售罄前完成补货"),
  note: t("Puts about a month of cover back on the shelf at the trailing sales pace.", "按近期销售速度，补货后可恢复约一个月的库存覆盖。"),
  change: {
    change_id: "chg-3021",
    kind: "inventory_action",
    status: "staged",
    summary: t("Add 52 units of ACME Kids Peel-and-Stick Ocean Wall Decals (AR-2102)", "为 ACME 儿童海洋主题可撕贴墙贴（AR-2102）补货 52 件"),
    items: [{ target: "AR-2102", field: "stock", before: 3, after: 55 }],
    created_at: "2026-07-09",
    created_by: "Avery",
    created_by_kind: "agent",
  },
};

export const SHOWCASE = { digest, change_preview };
