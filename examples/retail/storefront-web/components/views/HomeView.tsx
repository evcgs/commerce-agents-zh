// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useEffect, useState } from "react";
import {
  ArrivingPanel,
  estimateOf,
  Greeting,
  greeting,
  HomeSection,
  lang,
  type Order,
  plural,
  type Starter,
  Starters,
  t,
  upcoming,
  useCatalogIndex,
  useStoreFrame,
} from "web-shared";
import { fetchProducts } from "@/lib/api";
import { NOUNS, OrderThumb } from "@/lib/orders";
import type { Product } from "@/lib/types";
import ProductTile from "../ProductTile";

const STARTERS: Starter[] = [
  { icon: "search", prompt: t("A tent for a first family camping trip, under $250", "第一次家庭露营的帐篷，预算 250 美元以内") },
  { icon: "home", prompt: t("Set up a home office in a small spare room for about $800", "用小次卧搭一个家庭办公室，预算 800 美元左右") },
  { icon: "tag", prompt: t("Drip or espresso for busy weekday mornings?", "工作日早上赶时间，选手冲咖啡还是意式浓缩？") },
  { icon: "edit", prompt: t("Remember: small apartment, no outdoor storage, and a golden retriever", "记住：小公寓，没有户外储物空间，还有一只金毛") },
];

/** What the store is featuring: labelled bestseller or new, photographed ones first.
 * The bilingual catalog carries the labels in the active language ("bestseller"/"new"
 * in English, "热销"/"新品" in Chinese), so the pick matches either spelling. */
const FEATURED_LABELS = ["bestseller", "new", "热销", "新品"];
function featured(catalog: Record<string, Product>): Product[] {
  return Object.values(catalog)
    .filter((product) => product.labels?.some((label) => FEATURED_LABELS.includes(label)) && product.in_stock !== false)
    .sort((a, b) => Number(Boolean(b.image_url)) - Number(Boolean(a.image_url)))
    .slice(0, 4);
}

function Brief({ orders }: { orders: Order[] | null }) {
  if (!orders) return <>{t("Ask about a product, a project, an order, or a return.", "可以咨询商品、搭配方案、订单或退换货。")}</>;
  const open = upcoming(orders);
  if (!open.length) return <>{t("Nothing on the way right now. Ask about a product, a project, or a return.", "目前没有在途订单。可以咨询商品、搭配方案或退换货。")}</>;
  const late = open.filter((order) => order.status === "delayed");
  const next = estimateOf(open.find((order) => order.status !== "delayed") ?? open[0])?.date;
  return (
    <>
      {t(
        `${plural(open.length, "order")} on the way${next ? `; the next arrives ${next}` : ""}.`,
        `${open.length} 个订单在途中${next ? `，最近一单预计 ${next} 送达` : ""}。`,
      )}{" "}
      {late.length ? (
        <span className="font-semibold text-(--warn)">
          {t(
            late.length === 1 ? "One is running late." : `${late.length} are running late.`,
            late.length === 1 ? "其中 1 单正在延迟。" : `其中 ${late.length} 单正在延迟。`,
          )}
        </span>
      ) : null}
    </>
  );
}

/** The clock is read after mount, so the prerendered page never disagrees with the browser's day. */
function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return now;
}

export default function HomeView({
  shopperName,
  orders,
  ordersFailed,
  onSeeOrders,
}: {
  shopperName: string;
  orders: Order[] | null;
  ordersFailed: boolean;
  onSeeOrders: () => void;
}) {
  const { ask } = useStoreFrame();
  const catalog = useCatalogIndex(fetchProducts);
  const picks = featured(catalog);
  const now = useNow();
  return (
    <div className="flex flex-col gap-4">
      <Greeting
        eyebrow={now ? now.toLocaleDateString(lang() === "en" ? "en-US" : "zh-CN", { weekday: "long", month: "long", day: "numeric" }) : "\u00a0"}
        title={<h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-(--ink)">{t(`${now ? greeting(now) : "Hello"}, ${shopperName}`, `${now ? greeting(now) : "你好"}，${shopperName}`)}</h1>}
      >
        <Brief orders={orders} />
      </Greeting>
      <Starters items={STARTERS} />
      <ArrivingPanel orders={orders} failed={ordersFailed} nouns={NOUNS} thumb={(order) => <OrderThumb order={order} />} onSeeAll={onSeeOrders} />
      {picks.length ? (
        <HomeSection title={t("Popular right now", "人气热卖")} subtitle={t("Bestsellers and new arrivals; open one to ask about it", "畅销榜与新品，点开即可咨询")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {picks.map((product) => (
              <ProductTile key={product.product_id} product={product} fluid onOpen={(item) => ask(t(`Tell me about the ${item.title}.`, `跟我介绍一下${item.title}吧。`))} />
            ))}
          </div>
        </HomeSection>
      ) : null}
    </div>
  );
}
