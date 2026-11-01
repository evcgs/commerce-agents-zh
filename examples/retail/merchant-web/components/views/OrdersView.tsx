// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { AttentionList, AttentionRow, formatDayMonth, Notice, PageHeader, Panel, plural, QuotedAsData, RecordList, Skeleton, t, useResource } from "web-shared";
import { fetchAlerts } from "@/lib/api";
import { orderRows } from "@/lib/format";
import { ISSUE_KINDS } from "@/lib/kinds";
import type { OrderIssue, RecentOrder } from "@/lib/types";

function IssueRow({ issue, onAskAssistant }: { issue: OrderIssue; onAskAssistant: (text: string) => void }) {
  const style = ISSUE_KINDS[issue.kind];
  return (
    <AttentionRow
      icon={style.icon}
      tone={style.tone}
      title={issue.summary}
      meta={[style.label, t(`Order ${issue.order_id}`, `订单 ${issue.order_id}`), issue.listing_id ?? "", issue.opened_at ? t(`opened ${formatDayMonth(issue.opened_at)}`, `开启于 ${formatDayMonth(issue.opened_at)}`) : ""].filter(Boolean).join(" · ")}
      note={
        issue.buyer_message_excerpt ? (
          <div className="mt-1 rounded-[10px] bg-(--ground) px-3 py-2">
            <blockquote className="text-[13px] leading-snug text-(--ink-2)">&ldquo;{issue.buyer_message_excerpt}&rdquo;</blockquote>
            {/* Some fixture excerpts are injection attempts, so the note sits beside the quote. */}
            <QuotedAsData subject={t("Buyer message", "买家留言")} className="mt-1.5" />
          </div>
        ) : null
      }
      action={{
        label: issue.kind === "buyer_message" ? t("Draft reply", "起草回复") : t("Ask", "询问"),
        onClick: () => onAskAssistant(t(`What are my options for order ${issue.order_id}? ${issue.summary}.`, `订单 ${issue.order_id} 有哪些处理方案？${issue.summary}。`)),
      }}
    />
  );
}

export default function OrdersView({
  refreshKey,
  recentOrders,
  onAskAssistant,
}: {
  refreshKey: number;
  recentOrders: RecentOrder[] | null;
  onAskAssistant: (text: string) => void;
}) {
  const { data, failed } = useResource(fetchAlerts, [refreshKey]);
  const issues = data?.order_issues ?? [];

  return (
    <div className="ac-reveal flex flex-col gap-4">
      <PageHeader title={t("Orders", "订单")} subtitle={data ? (issues.length ? t(plural(issues.length, "open issue"), `${issues.length} 个待处理问题`) : t("No open issues", "暂无待处理问题")) : undefined} />
      {failed && !data ? (
        <Notice>{t("The merchant API isn't reachable, so order issues can't load.", "无法连接商家 API，订单问题加载失败。")}</Notice>
      ) : !data ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Panel title={t("Open issues", "待处理问题")} subtitle={issues.length ? String(issues.length) : undefined}>
            {issues.length === 0 ? (
              <p className="px-[18px] pb-4 text-[13.5px] text-(--ink-soft)">{t("No open order issues.", "暂无待处理的订单问题。")}</p>
            ) : (
              <AttentionList>
                {issues.map((issue) => (
                  <IssueRow key={issue.issue_id} issue={issue} onAskAssistant={onAskAssistant} />
                ))}
              </AttentionList>
            )}
          </Panel>
          <Panel title={t("Recent orders", "最近订单")}>
            {!recentOrders ? (
              <Skeleton className="mx-[18px] mb-4 h-40" />
            ) : recentOrders.length === 0 ? (
              <p className="px-[18px] pb-4 text-[13px] text-(--ink-soft)">{t("No recent orders to show.", "暂无最近订单。")}</p>
            ) : (
              <RecordList rows={orderRows(recentOrders)} />
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
