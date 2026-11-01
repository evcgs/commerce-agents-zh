// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { AskLink, BagPanel, CheckoutButton, formatMoney, optionValuesLabel, plural, RemoveLink, Stepper, t, TotalRow, useCatalogIndex, useStoreFrame } from "web-shared";
import { fetchProducts } from "@/lib/api";
import { STORE_POLICY } from "@/lib/storePolicy";
import type { CartItem, CartPayload, Product } from "@/lib/types";
import { DeliveryPromise, ProductImage, ProductTitle } from "./ProductTile";

/** The policy says "over" the threshold, so a cart at exactly the threshold is not free. */
function FreeShippingMeter({ subtotal }: { subtotal: number }) {
  const threshold = STORE_POLICY.freeShippingThreshold;
  const free = subtotal > threshold;
  const remaining = threshold - subtotal;
  const pct = Math.min((subtotal / threshold) * 100, 100);
  return (
    <div data-free-shipping-meter className="mb-3">
      <div className={`text-[13px] ${free ? "font-semibold text-(--ok)" : "text-(--ink-2)"}`}>
        {free ? (
          <>{t("Free shipping on this order ✓", "这单免运费 ✓")}</>
        ) : remaining > 0 ? (
          <>
            {t("", "再买 ")}
            <span className="font-bold text-(--ink)">{formatMoney(remaining)}</span>
            {t(" away from free shipping", " 即可免运费")}
          </>
        ) : (
          <>{t("Anything more ships free", "再加任意商品即免运费")}</>
        )}
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-(--well)">
        <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${free ? "bg-(--ok)" : "bg-(--accent)"}`} style={{ width: `${pct}%` }} />
      </div>
      {!free ? <div className="mt-1 text-[11.5px] text-(--ink-soft)">{t(`Standard shipping is free on orders over ${formatMoney(threshold)}.`, `订单满 ${formatMoney(threshold)} 可享免费标准配送。`)}</div> : null}
    </div>
  );
}

/** The listing behind a line; a variant's line borrows its family's brand and image. */
function asProduct(item: CartItem, catalog: Record<string, Product>): Product {
  const family = item.variant_of ? catalog[item.variant_of] : undefined;
  return (
    catalog[item.product_id] ?? {
      ...family,
      product_id: item.product_id,
      title: item.title,
      price: item.price,
      image_url: item.image_url ?? family?.image_url,
      options: undefined,
      option_values: item.option_values,
    }
  );
}

/** "the ACME Sleep Hybrid Mattress (queen)": what a message to the assistant calls a line. */
function lineName(item: CartItem): string {
  const chosen = optionValuesLabel(item);
  return chosen ? `${item.title} (${chosen})` : item.title;
}

/** The docked cart. Quantity and checkout are messages to the assistant, so every write is one it made. */
export default function CartPanel({ cart, checkoutStaged = false }: { cart: CartPayload | null; checkoutStaged?: boolean }) {
  const { ask } = useStoreFrame();
  const items = cart?.items ?? [];
  const count = cart?.item_count ?? 0;
  const catalog = useCatalogIndex(fetchProducts);

  return (
    <BagPanel
      title={t("Cart", "购物车")}
      count={t(plural(count, "item"), `${count} 件商品`)}
      isEmpty={items.length === 0}
      empty={
        <>
          {t("Nothing in the cart yet.", "购物车还是空的。")}
          <br />
          {t("Ask ACME Assistant for anything in the store.", "想要什么，跟 ACME 助手说一声就行。")}
        </>
      }
      footer={
        <>
          {items.length ? <FreeShippingMeter subtotal={cart?.subtotal ?? 0} /> : null}
          <TotalRow label={count ? t(`Subtotal · ${plural(count, "item")}`, `小计 · ${count} 件商品`) : t("Subtotal", "小计")} value={formatMoney(cart?.subtotal ?? 0, cart?.currency)} />
          <CheckoutButton staged={checkoutStaged} disabled={items.length === 0} prompt={t("Check out my cart.", "帮我结算购物车。")} />
          {items.length ? (
            <div className="mt-2.5 flex justify-center">
              <AskLink label={t("Ask about this cart", "让助手看看这车")} prompt={t("Look over my cart: anything missing or worth swapping?", "帮我看看购物车：有没有落下什么，或者有更值得换的？")} />
            </div>
          ) : null}
        </>
      }
    >
      <ul className="divide-y divide-(--line)">
        {items.map((item) => {
          const product = asProduct(item, catalog);
          return (
            <li key={item.product_id} className="ac-reveal flex gap-3 py-3 first:pt-0">
              <ProductImage product={product} className="h-16 w-16 shrink-0 rounded-[10px] !text-3xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {product.brand ? <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-(--ink-soft)">{product.brand}</div> : null}
                    {/* A two-line clamp cuts long names in half. */}
                    <ProductTitle title={item.title} className="line-clamp-3 text-[13.5px] font-semibold leading-snug text-(--ink)" />
                    {optionValuesLabel(item) ? <div className="text-[11.5px] text-(--ink-soft)">{optionValuesLabel(item)}</div> : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[14px] font-bold tabular-nums text-(--ink)">{formatMoney(item.line_total)}</div>
                    {item.quantity > 1 ? <div className="text-[11px] text-(--ink-soft)">{t(`${formatMoney(item.price)} each`, `每件 ${formatMoney(item.price)}`)}</div> : null}
                  </div>
                </div>
                <DeliveryPromise product={product} className="mt-0.5" />
                <div className="mt-2 flex items-center gap-2.5">
                  <Stepper
                    quantity={item.quantity}
                    itemTitle={lineName(item)}
                    onChange={(quantity) =>
                      ask(quantity < 1 ? t(`Remove the ${lineName(item)} from my cart.`, `把${lineName(item)}从我的购物车里移除。`) : t(`Change the ${lineName(item)} quantity to ${quantity}.`, `把${lineName(item)}的数量改为 ${quantity}。`))
                    }
                  />
                  <RemoveLink itemTitle={lineName(item)} onClick={() => ask(t(`Remove the ${lineName(item)} from my cart.`, `把${lineName(item)}从我的购物车里移除。`))} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </BagPanel>
  );
}
