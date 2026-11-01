// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

/**
 * Orders as a storefront lists them: the home's "coming up" card and the Orders view. A vertical
 * whose orders are something else (trips) passes its own nouns, status labels, and filters.
 */

import { type ReactNode, useState } from "react";
import { formatDayMonth, formatMoney, formatWeekday, plural } from "../format";
import { t } from "../i18n";
import type { Order } from "../protocol";
import { AskButton, Notice, PageHeader, Panel, Pill, Segmented, Skeleton, type Tone } from "../ui";
import { useStoreFrame } from "./frame";
import { MoreLink } from "./home";
import { StorePage } from "./Shell";

const STATUS: Record<string, { label: string; tone: Tone }> = {
  processing: { label: t("Processing", "处理中"), tone: "muted" },
  shipped: { label: t("Shipped", "已发货"), tone: "info" },
  out_for_delivery: { label: t("Out for delivery", "派送中"), tone: "info" },
  delayed: { label: t("Delayed", "已延迟"), tone: "warn" },
  delivered: { label: t("Delivered", "已送达"), tone: "ok" },
  cancelled: { label: t("Cancelled", "已取消"), tone: "muted" },
  return_initiated: { label: t("Return requested", "退货申请中"), tone: "violet" },
  refunded: { label: t("Refunded", "已退款"), tone: "ok" },
};

const OPEN = new Set(["processing", "shipped", "out_for_delivery", "delayed"]);
const ISO_DAY = /\d{4}-\d{2}-\d{2}/g;

/** Not yet delivered, cancelled, or refunded. */
export function isOpen(order: Order): boolean {
  return OPEN.has(order.status);
}

/** The open orders, soonest estimate first. */
export function upcoming(orders: Order[]): Order[] {
  const day = (order: Order) => order.estimated_delivery?.match(ISO_DAY)?.[0] ?? "9999";
  return orders.filter(isOpen).sort((a, b) => day(a).localeCompare(day(b)));
}

/** Splits an estimate like "2026-08-23 (revised; was 2026-08-17)" into the date and the note. */
export function estimateOf(order: Order): { date: string; note: string | null } | null {
  const raw = order.estimated_delivery;
  if (!raw) return null;
  const match = /^(\S+)\s*\((.*)\)\s*$/.exec(raw);
  const date = match ? match[1] : raw;
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? formatWeekday(date) : date,
    note: match ? match[2].replace(ISO_DAY, formatDayMonth) : null,
  };
}

/** The label for a status, the vertical's own word first ("return_initiated" → "Return requested"). */
export function orderStatusLabel(status: string, labels?: Record<string, string>): string {
  return labels?.[status] ?? STATUS[status]?.label ?? status.replaceAll("_", " ");
}

export function OrderStatusPill({ status, labels }: { status: string; labels?: Record<string, string> }) {
  return (
    <Pill tone={STATUS[status]?.tone ?? "muted"} dot>
      {orderStatusLabel(status, labels)}
    </Pill>
  );
}

/** What a row hands to the assistant. */
export interface OrderHandoff {
  label: string;
  prompt: string;
}

export interface OrderNouns {
  /** "order", "trip" */
  one: string;
  /** The view: "Orders", "Trips" */
  title: string;
  /** The home card: "Arriving", "Coming up" */
  cardTitle: string;
  /** The home card with nothing open: "Nothing on the way" */
  noneOpen: string;
  /** Before an open order's date: "Arrives", "Starts". */
  openVerb: string;
  /** The date line of a closed order: delivered, cancelled, or refunded. */
  closedWhen: (order: Order, date: string) => string;
  /** This vertical's words for the shared statuses ("shipped" → "Confirmed"). */
  statusLabels?: Record<string, string>;
  /** The view's filters after "All". */
  filters: { id: string; label: string; match: (order: Order) => boolean }[];
  handoff: (order: Order) => OrderHandoff;
}

/** Retail's vocabulary; a vertical spreads this and overrides what differs. */
export const ORDER_NOUNS: OrderNouns = {
  one: t("order", "订单"),
  title: t("Orders", "订单"),
  cardTitle: t("Arriving", "即将送达"),
  noneOpen: t("Nothing on the way", "暂无在途订单"),
  openVerb: t("Arrives", "预计送达"),
  closedWhen: (order, date) =>
    order.status === "delivered"
      ? t(`Delivered ${date}`, `已于 ${date} 送达`)
      : t(`Placed ${formatDayMonth(order.placed_at)}`, `下单于 ${formatDayMonth(order.placed_at)}`),
  filters: [
    { id: "open", label: t("On the way", "在途"), match: isOpen },
    { id: "delayed", label: t("Delayed", "延迟"), match: (order) => order.status === "delayed" },
    { id: "closed", label: t("Past", "历史"), match: (order) => !isOpen(order) },
  ],
  handoff(order) {
    const ref = t(`order ${order.order_id}`, `订单 ${order.order_id}`);
    if (order.status === "delayed")
      return { label: t("Ask why", "问问原因"), prompt: t(`Why is ${ref} delayed, and when will it arrive?`, `${ref} 为什么延迟了？预计什么时候能到？`) };
    if (order.status === "delivered")
      return { label: t("Ask about a return", "咨询退货"), prompt: t(`Can I still return something from ${ref}?`, `${ref} 里还有商品可以退货吗？`) };
    if (isOpen(order)) return { label: t("Ask", "询问"), prompt: t(`Where is ${ref} right now?`, `${ref} 现在到哪儿了？`) };
    return { label: t("Ask", "询问"), prompt: t(`What's the status of ${ref}?`, `${ref} 目前是什么状态？`) };
  },
};

function orderTitle(order: Order): string {
  const [first, ...rest] = order.items;
  if (!first) return order.order_id;
  return rest.length ? t(`${first.title} + ${rest.length} more`, `${first.title} + 另外 ${rest.length} 件`) : first.title;
}

function When({ order, nouns }: { order: Order; nouns: OrderNouns }) {
  const estimate = estimateOf(order);
  if (!estimate) return <span>{t(`Placed ${formatDayMonth(order.placed_at)}`, `下单于 ${formatDayMonth(order.placed_at)}`)}</span>;
  if (!isOpen(order)) return <span>{nouns.closedWhen(order, estimate.date)}</span>;
  return (
    <span className={order.status === "delayed" ? "font-semibold text-(--warn)" : ""} title={estimate.note ?? undefined}>
      {order.status === "delayed" ? t("Expected", "预计") : nouns.openVerb} {estimate.date}
    </span>
  );
}

function OrderRow({ order, nouns, thumb, compact = false }: { order: Order; nouns: OrderNouns; thumb: (order: Order) => ReactNode; compact?: boolean }) {
  const { ask } = useStoreFrame();
  const handoff = nouns.handoff(order);
  const estimate = estimateOf(order);
  return (
    <li className="flex items-center gap-3 border-t border-(--line) px-[18px] py-3 first:border-t-0">
      {thumb(order)}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-(--ink)">{orderTitle(order)}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-(--ink-soft)">
          {compact ? <OrderStatusPill status={order.status} labels={nouns.statusLabels} /> : <span className="tabular-nums">{order.order_id}</span>}
          <span aria-hidden>·</span>
          <When order={order} nouns={nouns} />
        </div>
        {!compact && estimate?.note && isOpen(order) ? <div className="mt-0.5 text-[12px] leading-snug text-(--ink-soft)">{estimate.note}</div> : null}
      </div>
      {compact ? null : <OrderStatusPill status={order.status} labels={nouns.statusLabels} />}
      {compact ? null : (
        <span className="hidden w-20 text-right text-[14px] font-semibold tabular-nums text-(--ink) sm:block">
          {formatMoney(order.total, order.currency)}
        </span>
      )}
      <AskButton label={handoff.label} onClick={() => ask(handoff.prompt)} />
    </li>
  );
}

/** The home's card of what is coming: open orders soonest first, else the two most recent. */
export function ArrivingPanel({
  orders,
  failed = false,
  nouns,
  thumb,
  onSeeAll,
}: {
  orders: Order[] | null;
  failed?: boolean;
  nouns: OrderNouns;
  thumb: (order: Order) => ReactNode;
  onSeeAll?: () => void;
}) {
  if (!orders) return failed ? <Notice>{t(`Couldn't load your ${nouns.title.toLowerCase()}.`, `无法加载你的${nouns.title}。`)}</Notice> : <Skeleton className="h-[188px]" />;
  // A shopper with no history gets no card; one with nothing open sees the two most recent.
  if (!orders.length) return null;
  const open = upcoming(orders).slice(0, 3);
  const shown = open.length ? open : orders.slice(0, 2);
  return (
    <Panel
      title={nouns.cardTitle}
      subtitle={open.length ? t(plural(orders.length, nouns.one), `共 ${orders.length} 条${nouns.one}`) : nouns.noneOpen}
      action={onSeeAll ? <MoreLink label={t(`All ${nouns.title.toLowerCase()}`, `全部${nouns.title}`)} onClick={onSeeAll} /> : null}
    >
      <ul>
        {shown.map((order) => (
          <OrderRow key={order.order_id} order={order} nouns={nouns} thumb={thumb} compact />
        ))}
      </ul>
    </Panel>
  );
}

/** The Orders (or Trips) view. */
export function OrdersView({
  orders,
  failed,
  nouns,
  subtitle,
  thumb,
}: {
  orders: Order[] | null;
  failed: boolean;
  nouns: OrderNouns;
  subtitle?: ReactNode;
  thumb: (order: Order) => ReactNode;
}) {
  const [filter, setFilter] = useState("all");
  const all = orders ?? [];
  const active = nouns.filters.find((entry) => entry.id === filter);
  const shown = active ? all.filter(active.match) : all;
  const title = nouns.title.toLowerCase();
  return (
    <StorePage>
      <PageHeader title={nouns.title} subtitle={subtitle}>
        <Segmented
          label={t(`Filter ${title}`, `筛选${title}`)}
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: t("All", "全部"), count: all.length },
            ...nouns.filters.map((entry) => ({ id: entry.id, label: entry.label, count: all.filter(entry.match).length })),
          ]}
        />
      </PageHeader>
      {orders === null ? (
        failed ? (
          <Notice>{t(`Couldn't load your ${title}. The assistant can still look them up.`, `无法加载你的${title}。助手仍然可以帮你查询。`)}</Notice>
        ) : (
          <Skeleton className="h-[320px]" />
        )
      ) : shown.length ? (
        <Panel>
          <ul>
            {shown.map((order) => (
              <OrderRow key={order.order_id} order={order} nouns={nouns} thumb={thumb} />
            ))}
          </ul>
        </Panel>
      ) : (
        <Notice>{t(`No ${title} here.`, `这里没有${title}。`)}</Notice>
      )}
    </StorePage>
  );
}
