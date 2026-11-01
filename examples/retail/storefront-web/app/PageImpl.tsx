// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

// The page body, imported with ssr:false from page.tsx: the language lives in a
// cookie the client reads at module load, and rendering client-side keeps every
// module-level bilingual constant and the server's HTML on the same page.

import { useCallback, useEffect, useState } from "react";
import { type AgentEvent, formatMoney, OrdersView, plural, StoreShell, type StoreView, t, upcoming, useAgentTurn, useResource, useSession } from "web-shared";
import CartPanel from "@/components/CartPanel";
import Chat from "@/components/Chat";
import HomeView from "@/components/views/HomeView";
import { api, UNREACHABLE } from "@/lib/api";
import { NOUNS, OrderThumb } from "@/lib/orders";
import type { CartPayload } from "@/lib/types";

type View = "assistant" | "orders";

const ASSISTANT = t("ACME Assistant", "ACME 助手");

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5 pr-1">
      <span aria-hidden className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-(--ink) text-[15px] font-bold text-(--surface)">
        A
      </span>
      <span className="text-[17px] font-bold tracking-[-0.02em] text-(--ink)">ACME</span>
    </span>
  );
}

export default function StorefrontPage() {
  const session = useSession(api);
  const [view, setView] = useState<View>("assistant");
  const [cart, setCart] = useState<CartPayload | null>(null);
  // A staged checkout owns the panel's primary action until the cart changes again.
  const [checkoutStaged, setCheckoutStaged] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleCartUpdate = useCallback((next: CartPayload) => {
    setCart(next);
    setCheckoutStaged(false);
  }, []);

  const onEvent = useCallback(
    (event: AgentEvent) => {
      if (event.type === "cart_update") handleCartUpdate(event.data.cart as CartPayload);
      else if (event.type === "ui" && event.data.component === "checkout") setCheckoutStaged(true);
    },
    [handleCartUpdate],
  );

  const chat = useAgentTurn(api, { ...session, unreachable: UNREACHABLE, onEvent });
  // A reply may have started a return, so orders re-read after each one.
  const { data: orders, failed: ordersFailed } = useResource(session.sessionId ? () => api.fetchOrders() : null, [session.sessionId, chat.completed]);

  useEffect(() => {
    if (session.sessionId) void api.fetchCart<CartPayload>().then((next) => next && setCart(next));
  }, [session.sessionId]);

  const late = orders?.filter((order) => order.status === "delayed").length ?? 0;
  const views: StoreView<View>[] = [
    { id: "assistant", label: t("Assistant", "助手"), icon: "spark" },
    { id: "orders", label: t("Orders", "订单"), icon: "box", attention: late ? { count: late, label: t(`${late} delayed`, `${late} 单延迟`) } : null },
  ];
  const shopper = session.shopper ?? { name: t("Guest", "访客") };
  const count = cart?.item_count ?? 0;

  return (
    <StoreShell
      brand={<Wordmark />}
      views={views}
      view={view}
      onViewChange={setView}
      chat={chat}
      api={api}
      assistantName={ASSISTANT}
      shopper={shopper}
      bag={{ label: t("Cart", "购物车"), count, noun: t("item", "件商品"), figure: count ? formatMoney(cart?.subtotal ?? 0, cart?.currency) : null }}
      panel={<CartPanel cart={cart} checkoutStaged={checkoutStaged} />}
      panelOpen={panelOpen}
      onPanelOpenChange={setPanelOpen}
      placeholder={view === "orders" ? t("Ask about an order, a return, a delivery…", "咨询订单、退换货、物流……") : t("Ask about a product, a project, an order…", "咨询商品、搭配方案、订单……")}
    >
      {/* The conversation stays mounted under the other view so its cards keep their state. */}
      <div className={view === "assistant" ? "h-full" : "hidden"}>
        <Chat chat={chat} onCartUpdate={handleCartUpdate} home={<HomeView shopperName={shopper.name} orders={orders} ordersFailed={ordersFailed} onSeeOrders={() => setView("orders")} />} />
      </div>
      {view === "orders" ? (
        <OrdersView
          orders={orders}
          failed={ordersFailed}
          nouns={NOUNS}
          subtitle={
            orders
              ? late
                ? t(
                    `${plural(late, "order")} running late. Ask why, or ask about a return on anything delivered.`,
                    `${late} 个订单正在延迟。可以问问原因，或咨询已送达商品的退换。`,
                  )
                : t(
                    `${plural(upcoming(orders).length, "order")} on the way. Ask about any of them, or about a return on anything delivered.`,
                    `${upcoming(orders).length} 个订单在途中。可以逐单咨询，或咨询已送达商品的退换。`,
                  )
              : undefined
          }
          thumb={(order) => <OrderThumb order={order} />}
        />
      ) : null}
    </StoreShell>
  );
}
