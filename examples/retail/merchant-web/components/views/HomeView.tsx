// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useMemo, useState } from "react";
import {
  ApprovalsBanner,
  askWhy,
  AttentionList,
  AttentionRow,
  coverLabel,
  formatChangePct,
  formatComparisonLabel,
  formatDayMonth,
  formatMoney,
  formatNumber,
  formatPeriodLabel,
  formatRate,
  greeting,
  Icon,
  KindIcon,
  Notice,
  optionValuesLabel,
  PageHeader,
  Panel,
  Pill,
  plural,
  QueueOverflow,
  ratioChangePct,
  RecentChanges,
  RecordList,
  Segmented,
  Skeleton,
  StatStrip,
  StatTile,
  t,
  ViewLink,
} from "web-shared";
import { orderRows } from "@/lib/format";
import { INVENTORY_KINDS, ISSUE_KINDS } from "@/lib/kinds";
import type { HomeInsight, InventoryAlert, MetricPoint, OrderIssue, OverviewResponse } from "@/lib/types";

type Filter = "all" | "orders" | "stock" | "slow";
type Row = { kind: "issue"; issue: OrderIssue } | { kind: "inventory"; alert: InventoryAlert };

const ROW_CAP = 6;

/** One sentence from the overview: the sales move and what needs the operator. */
function briefing(data: OverviewResponse): string {
  const { snapshot, needs_attention } = data;
  const parts: string[] = [];
  if (snapshot.sales_change_pct != null) {
    const direction = snapshot.sales_change_pct >= 0 ? t("up", "上升") : t("down", "下降");
    parts.push(t(`Sales are ${direction} ${formatChangePct(Math.abs(snapshot.sales_change_pct)).replace("+", "")} on the week.`, `本周销售额${direction} ${formatChangePct(Math.abs(snapshot.sales_change_pct)).replace("+", "")}。`));
  }
  const orders = needs_attention.order_issues.length;
  const listings = needs_attention.inventory.length;
  const needs = [orders ? t(plural(orders, "order"), `${formatNumber(orders)} 个订单`) : "", listings ? t(plural(listings, "listing"), `${formatNumber(listings)} 个商品`) : ""].filter(Boolean);
  parts.push(needs.length ? t(`${needs.join(" and ")} need you today.`, `今天有 ${needs.join("和")} 需要你处理。`) : t("Nothing needs you today.", "今天没有需要你处理的事项。"));
  return parts.join(" ");
}

function values(points?: MetricPoint[]): number[] | undefined {
  return points?.map((point) => point.value);
}

function rows(data: OverviewResponse, filter: Filter): Row[] {
  const { inventory, order_issues } = data.needs_attention;
  const issues = order_issues.map((issue) => ({ kind: "issue" as const, issue }));
  const lowStock = inventory
    .filter((alert) => alert.kind === "low_stock")
    .sort((a, b) => (a.days_of_cover ?? Infinity) - (b.days_of_cover ?? Infinity))
    .map((alert) => ({ kind: "inventory" as const, alert }));
  const slow = inventory.filter((alert) => alert.kind === "slow_mover").map((alert) => ({ kind: "inventory" as const, alert }));
  if (filter === "orders") return issues;
  if (filter === "stock") return lowStock;
  if (filter === "slow") return slow;
  // The most urgent stock alert leads; it is the one a seller acts on first.
  return [...lowStock.slice(0, 1), ...issues, ...lowStock.slice(1), ...slow];
}

function IssueRow({ issue, onAskAssistant }: { issue: OrderIssue; onAskAssistant: (text: string) => void }) {
  const style = ISSUE_KINDS[issue.kind];
  return (
    <AttentionRow
      icon={style.icon}
      tone={style.tone}
      title={issue.summary}
      meta={[style.label, t(`Order ${issue.order_id}`, `订单 ${issue.order_id}`), issue.opened_at ? t(`opened ${formatDayMonth(issue.opened_at)}`, `开启于 ${formatDayMonth(issue.opened_at)}`) : ""].filter(Boolean).join(" · ")}
      action={{
        label: issue.kind === "buyer_message" ? t("Draft reply", "起草回复") : t("Ask", "询问"),
        onClick: () => onAskAssistant(t(`What are my options for order ${issue.order_id}? ${issue.summary}.`, `订单 ${issue.order_id} 有哪些处理方案？${issue.summary}。`)),
      }}
    />
  );
}

function InventoryRow({ alert, onAskAssistant }: { alert: InventoryAlert; onAskAssistant: (text: string) => void }) {
  const style = INVENTORY_KINDS[alert.kind];
  const soldOut = alert.kind === "low_stock" && alert.stock === 0;
  const low = alert.kind === "low_stock";
  const chosen = optionValuesLabel(alert);
  const name = chosen ? `${alert.title} · ${chosen}` : alert.title;
  const ref = `${name} (${alert.listing_id})`;
  return (
    <AttentionRow
      icon={style.icon}
      tone={soldOut ? "danger" : style.tone}
      title={name}
      meta={
        <>
          <span className={soldOut ? "font-semibold text-(--danger)" : low ? "font-semibold text-(--warn)" : ""}>
            {soldOut ? t("Sold out", "已售罄") : t(`${formatNumber(alert.stock)} in stock`, `库存 ${formatNumber(alert.stock)}`)}
          </span>
          {[
            "",
            alert.days_of_cover != null && !soldOut ? coverLabel(alert.days_of_cover) : "",
            alert.sales_last_30d != null ? t(`${formatNumber(alert.sales_last_30d)} sold in 30 days`, `近 30 天售出 ${formatNumber(alert.sales_last_30d)}`) : "",
            alert.listing_id,
            soldOut && alert.storefront_visible === false ? t("hidden from the storefront", "已从店面隐藏") : "",
          ]
            .filter((part, index) => index === 0 || part)
            .join(" · ")}
        </>
      }
      note={
        // A paused listing still alerts here but shows no chip to shoppers.
        low && alert.stock > 0 && alert.storefront_visible ? (
          <Pill tone="warn" dot>
            {t(`Storefront shows “Only ${formatNumber(alert.stock)} left”`, `店面显示“仅剩 ${formatNumber(alert.stock)} 件”`)}
          </Pill>
        ) : null
      }
      action={{
        label: low ? t("Draft restock", "起草补货") : t("Plan markdown", "规划降价"),
        onClick: () => onAskAssistant(low ? t(`Draft a restock plan for ${ref}.`, `为 ${ref} 起草一份补货方案。`) : t(`Plan a markdown for ${ref}.`, `为 ${ref} 规划一次降价。`)),
      }}
    />
  );
}

function Insights({ insights, onAskAssistant }: { insights: HomeInsight[]; onAskAssistant: (text: string) => void }) {
  if (insights.length === 0) return null;
  return (
    <Panel title={t("From the assistant", "来自助手的洞察")} icon={<KindIcon icon="spark" tone="accent" size={24} />}>
      <ul className="divide-y divide-(--line)">
        {insights.map((insight) => (
          <li key={insight.insight_id} className="px-[18px] py-2.5">
            <div className="text-[13px] font-medium leading-snug text-(--ink)">{insight.headline}</div>
            {insight.detail ? <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-(--ink-soft)">{insight.detail}</div> : null}
            <button
              type="button"
              onClick={() => onAskAssistant(insight.prompt)}
              className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-(--accent-ink) hover:underline"
            >
              {t("Ask", "追问")} <Icon name="arrow-right" size={13} />
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function HomeView({
  data,
  failed,
  operator,
  onAskAssistant,
  onNavigate,
}: {
  data: OverviewResponse | null;
  failed: boolean;
  operator?: string;
  /** Prefills the composer; nothing is sent. */
  onAskAssistant: (text: string) => void;
  onNavigate: (view: "orders" | "inventory") => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const pending = useMemo(() => (data?.needs_attention.pending_changes ?? []).filter((change) => change.status === "staged"), [data]);
  const queue = useMemo(() => (data ? rows(data, filter) : []), [data, filter]);
  const now = useMemo(() => new Date(), []);
  const title = `${greeting(now)}${operator ? `, ${operator}` : ""}`;
  const today = now.toLocaleDateString(t("en-US", "zh-CN"), { weekday: "long", month: "long", day: "numeric" });

  if (failed && !data) {
    return (
      <>
        <PageHeader title={title} subtitle={today} />
        <Notice>
          {t("The merchant API on port 8000 isn't reachable. Start it with", "无法连接 8000 端口上的商家 API。请先运行")}{" "}
          <code className="rounded bg-(--well) px-1 font-mono text-[13px]">uvicorn retail.api.main:app --app-dir examples --port 8000</code>{" "}
          {t("and reload.", "再刷新页面。")}
        </Notice>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <PageHeader title={title} subtitle={today} />
        <Skeleton className="h-36" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-72" />
        </div>
      </>
    );
  }

  const { snapshot } = data;
  const counts = {
    orders: data.needs_attention.order_issues.length,
    stock: data.needs_attention.inventory.filter((alert) => alert.kind === "low_stock").length,
    slow: data.needs_attention.inventory.filter((alert) => alert.kind === "slow_mover").length,
  };
  const comparison = formatComparisonLabel(snapshot.period, snapshot.compare_to);
  // The snapshot carries no average-order delta, so derive it from the sales and orders deltas.
  const aovChangePct = ratioChangePct(snapshot.sales_change_pct, snapshot.orders_change_pct);
  const currency = snapshot.currency ?? "USD";

  return (
    <div className="ac-reveal flex flex-col gap-5">
      <PageHeader title={title} subtitle={`${today} · ${briefing(data)}`} />

      <ApprovalsBanner changes={pending} onReview={() => onAskAssistant(t("Walk me through the changes awaiting my approval and what each one would do.", "带我过一遍等待我审批的变更，以及每项变更会做什么。"))} />

      <Panel title={t("This week", "本周")} subtitle={`${formatPeriodLabel(snapshot.period)}${comparison ? t(` · against the ${comparison}`, ` · 对比${comparison}`) : ""}`} bodyClassName="pb-1">
        <StatStrip>
          <StatTile
            label={t("Sales", "销售额")}
            value={formatMoney(snapshot.sales, currency, { whole: snapshot.sales >= 1000 })}
            changePct={snapshot.sales_change_pct}
            points={values(data.trends?.sales)}
            prior={values(data.trends_prior?.sales)}
            onClick={() => onAskAssistant(askWhy(t("Sales", "销售额"), snapshot.sales_change_pct, comparison))}
            ariaLabel={t("Sales: ask the assistant why", "销售额：询问助手原因")}
          />
          <StatTile
            label={t("Orders", "订单量")}
            value={formatNumber(snapshot.orders)}
            changePct={snapshot.orders_change_pct}
            points={values(data.trends?.orders)}
            prior={values(data.trends_prior?.orders)}
            onClick={() => onAskAssistant(askWhy(t("Orders", "订单量"), snapshot.orders_change_pct, comparison))}
            ariaLabel={t("Orders: ask the assistant why", "订单量：询问助手原因")}
          />
          <StatTile
            label={t("Conversion", "转化率")}
            value={snapshot.conversion_rate != null ? formatRate(snapshot.conversion_rate) : "—"}
            changePct={snapshot.conversion_change_pct}
            points={values(data.trends?.conversion)}
            prior={values(data.trends_prior?.conversion)}
            onClick={() => onAskAssistant(askWhy(t("Conversion", "转化率"), snapshot.conversion_change_pct, comparison))}
            ariaLabel={t("Conversion: ask the assistant why", "转化率：询问助手原因")}
          />
          <StatTile
            label={t("Average order", "客单价")}
            value={snapshot.average_order_value != null ? formatMoney(snapshot.average_order_value, currency) : "—"}
            changePct={aovChangePct}
            points={values(data.trends?.average_order_value)}
            prior={values(data.trends_prior?.average_order_value)}
            onClick={() => onAskAssistant(askWhy(t("Average order value", "客单价"), aovChangePct, comparison))}
            ariaLabel={t("Average order value: ask the assistant why", "客单价：询问助手原因")}
          />
        </StatStrip>
      </Panel>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel
          title={t("Needs you today", "今日待办")}
          action={
            <Segmented<Filter>
              label={t("Filter attention items", "筛选待办事项")}
              value={filter}
              onChange={setFilter}
              options={[
                { id: "all", label: t("All", "全部"), count: counts.orders + counts.stock + counts.slow },
                { id: "orders", label: t("Orders", "订单"), count: counts.orders },
                { id: "stock", label: t("Low stock", "低库存"), count: counts.stock },
                { id: "slow", label: t("Slow", "滞销"), count: counts.slow },
              ]}
            />
          }
        >
          {queue.length === 0 ? (
            <p className="px-[18px] pb-4 pt-1 text-[13.5px] text-(--ink-soft)">{t("Nothing needs you today.", "今天没有需要你处理的事项。")}</p>
          ) : (
            <>
              <AttentionList>
                {queue.slice(0, ROW_CAP).map((row) =>
                  row.kind === "issue" ? (
                    <IssueRow key={row.issue.issue_id} issue={row.issue} onAskAssistant={onAskAssistant} />
                  ) : (
                    <InventoryRow key={`${row.alert.kind}-${row.alert.listing_id}`} alert={row.alert} onAskAssistant={onAskAssistant} />
                  ),
                )}
              </AttentionList>
              <QueueOverflow
                hidden={queue.length - ROW_CAP}
                link={{
                  label: t("See all", "查看全部"),
                  // The hidden rows are order issues first, so open Orders when any of them is one.
                  onClick: () => onNavigate(queue.slice(ROW_CAP).some((row) => row.kind === "issue") ? "orders" : "inventory"),
                }}
              />
            </>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Insights insights={data.insights ?? []} onAskAssistant={onAskAssistant} />
          <Panel title={t("Recent orders", "最近订单")} action={<ViewLink label={t("All orders", "全部订单")} onClick={() => onNavigate("orders")} />}>
            {data.recent_orders.length === 0 ? (
              <p className="px-[18px] pb-4 text-[13px] text-(--ink-soft)">{t("No orders yet.", "还没有订单。")}</p>
            ) : (
              <RecordList rows={orderRows(data.recent_orders.slice(0, 4))} />
            )}
          </Panel>
          <RecentChanges changes={data.recent_changes} />
        </div>
      </div>
    </div>
  );
}
