// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

// The page body, imported with ssr:false from page.tsx: the language lives in a
// cookie the client reads at module load, and rendering client-side keeps every
// module-level bilingual constant and the server's HTML on the same page.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AssistantRail,
  Inspector,
  type PortalNavItem,
  PortalShell,
  type Prefill,
  t,
  useMerchantChat,
  useResource,
  useSession,
} from "web-shared";
import AssistantPanel from "@/components/AssistantPanel";
import { BackendConfigButton, BackendConfigSheet } from "@/components/BackendConfigSheet";
import { ModelConfigButton, ModelConfigSheet } from "@/components/ModelConfigSheet";
import { PromptConfigButton, PromptViewerSheet } from "@/components/PromptViewerSheet";
import CatalogView from "@/components/views/CatalogView";
import HomeView from "@/components/views/HomeView";
import InventoryView from "@/components/views/InventoryView";
import OrdersView from "@/components/views/OrdersView";
import { api, fetchOverview, UNREACHABLE } from "@/lib/api";
import type { StagedChange } from "@/lib/types";

type PortalView = "home" | "catalog" | "orders" | "inventory";

function StoreMark() {
  return (
    <span
      aria-hidden
      className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-(--ink) text-[16px] font-bold text-(--brand) shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)]"
    >
      A
    </span>
  );
}

export default function PortalPage() {
  const session = useSession(api);
  const [view, setView] = useState<PortalView>("home");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [backendsOpen, setBackendsOpen] = useState(false);
  // Bumped whenever a staged change moves, so every widget re-reads the store the agent wrote.
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshPortal = useCallback(() => setRefreshKey((value) => value + 1), []);

  const chat = useMerchantChat<StagedChange>(api, {
    ...session,
    unreachable: UNREACHABLE,
    onPortalRefresh: refreshPortal,
  });

  // The overview feeds the home page and the sidebar counts, so it loads here.
  const { data: overview, failed: overviewFailed } = useResource(session.sessionId ? fetchOverview : null, [session.sessionId, refreshKey]);

  // The rail is part of the default layout on wide screens; narrow screens open it on demand.
  useEffect(() => {
    setAssistantOpen(window.innerWidth >= 1024);
  }, []);

  const askAssistant = useCallback((text: string) => {
    setAssistantOpen(true);
    setPrefill({ text, nonce: Date.now() });
  }, []);

  const nav = useMemo<PortalNavItem<PortalView>[]>(() => {
    const alerts = overview?.snapshot.alerts;
    return [
      { id: "home", label: t("Home", "首页"), icon: "home" },
      { id: "catalog", label: t("Catalog", "商品目录"), icon: "tag" },
      { id: "orders", label: t("Orders", "订单"), icon: "inbox", attention: alerts?.order_issues || null },
      {
        id: "inventory",
        label: t("Inventory", "库存"),
        icon: "box",
        count: alerts ? (alerts.low_stock ?? 0) + (alerts.slow_movers ?? 0) : null,
      },
    ];
  }, [overview]);

  return (
    <>
      <PortalShell
        brand={{ mark: <StoreMark />, name: "ACME", detail: t("Merchant workspace", "商家工作台") }}
        nav={nav}
        view={view}
        onViewChange={setView}
        operator={{ name: session.operator ?? t("Operator", "店员"), role: t("Store manager", "店长") }}
        assistantOpen={assistantOpen}
        assistantBusy={chat.busy}
        onToggleAssistant={() => setAssistantOpen((open) => !open)}
        controls={
          <>
            <PromptConfigButton onOpen={() => setPromptsOpen(true)} />
            <ModelConfigButton onOpen={() => setModelsOpen(true)} />
            <BackendConfigButton onOpen={() => setBackendsOpen(true)} />
          </>
        }
        rail={
          <AssistantRail
            open={assistantOpen}
            storageKey="acme-retail-merchant-panel-width"
            onClose={() => setAssistantOpen(false)}
          >
            {(rail) => (
              <AssistantPanel
                chat={chat}
                prefill={prefill}
                onPrefill={askAssistant}
                newMemoryCount={chat.newMemoryKeys.size}
                onOpenActivity={() => setActivityOpen(true)}
                {...rail}
              />
            )}
          </AssistantRail>
        }
      >
        {session.sessionId ? (
          <>
            {view === "home" ? (
              <HomeView
                data={overview}
                failed={overviewFailed}
                operator={session.operator}
                onAskAssistant={askAssistant}
                onNavigate={setView}
              />
            ) : null}
            {view === "catalog" ? <CatalogView refreshKey={refreshKey} onAskAssistant={askAssistant} /> : null}
            {view === "orders" ? (
              <OrdersView refreshKey={refreshKey} recentOrders={overview?.recent_orders ?? (overviewFailed ? [] : null)} onAskAssistant={askAssistant} />
            ) : null}
            {view === "inventory" ? <InventoryView refreshKey={refreshKey} onAskAssistant={askAssistant} /> : null}
          </>
        ) : null}
      </PortalShell>
      {modelsOpen ? <ModelConfigSheet onClose={() => setModelsOpen(false)} /> : null}
      {promptsOpen ? <PromptViewerSheet onClose={() => setPromptsOpen(false)} /> : null}
      {backendsOpen ? <BackendConfigSheet onClose={() => setBackendsOpen(false)} /> : null}
      {activityOpen ? (
        <Inspector
          turnCount={chat.turnCount}
          streaming={chat.streaming}
          trace={chat.trace}
          memory={chat.memory}
          newMemoryKeys={chat.newMemoryKeys}
          memoryTitle={t("Business memory", "业务记忆")}
          onClose={() => setActivityOpen(false)}
        />
      ) : null}
    </>
  );
}
