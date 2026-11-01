// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { ChangeChip, formatMoney, formatNumber, formatPeriodLabel, formatRate, GenCard, GenCardHeader, Sparkline, t, titleCase } from "web-shared";
import type { MetricEntry, MetricsPayload } from "@/lib/types";

const CURRENCY_METRICS = new Set(["sales", "average_order_value", "revenue", "spend"]);
const RATE_METRICS = new Set(["conversion_rate", "return_rate", "click_through_rate"]);

const METRIC_LABELS: Record<string, string> = {
  sales: t("Sales", "销售额"),
  orders: t("Orders", "订单量"),
  traffic: t("Traffic", "流量"),
  conversion_rate: t("Conversion rate", "转化率"),
  average_order_value: t("Average order", "客单价"),
  revenue: t("Revenue", "收入"),
  spend: t("Spend", "支出"),
  return_rate: t("Return rate", "退货率"),
  click_through_rate: t("Click through rate", "点击率"),
};

function metricLabel(metric: string): string {
  if (metric === "average_order_value") return t("Average order", "客单价");
  return METRIC_LABELS[metric] ?? titleCase(metric);
}

function metricValue(entry: MetricEntry): string | null {
  if (entry.value == null) return null;
  if (CURRENCY_METRICS.has(entry.metric)) return formatMoney(entry.value, entry.currency ?? "USD", { whole: entry.value >= 1000 });
  if (RATE_METRICS.has(entry.metric)) return formatRate(entry.value);
  return formatNumber(entry.value);
}

export default function MetricsCard({ payload }: { payload: MetricsPayload }) {
  const metrics = payload.metrics ?? [];
  return (
    <GenCard>
      <GenCardHeader title={payload.title ?? t("Performance", "业绩表现")} aside={payload.period ? formatPeriodLabel(payload.period) : null} />
      <div className="mt-2 grid grid-cols-2 border-t border-(--line) [&>*:nth-child(even)]:border-l [&>*:nth-child(n+3)]:border-t [&>*]:border-(--line)">
        {metrics.map((entry, index) => {
          const value = metricValue(entry);
          const points = entry.series?.points?.map((point) => point.value);
          return (
            <div key={`${entry.metric}-${index}`} className="px-3.5 py-3">
              <div className="text-[12px] font-medium text-(--ink-soft)">{metricLabel(entry.metric)}</div>
              <div className="mt-1 flex items-baseline gap-2">
                {value != null ? <span className="text-[20px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-(--ink)">{value}</span> : null}
                <ChangeChip changePct={entry.change_pct} />
              </div>
              {points && points.length > 1 ? <Sparkline points={points} height={34} label={t(`${metricLabel(entry.metric)} trend`, `${metricLabel(entry.metric)}走势`)} className="mt-2" /> : null}
              {entry.note ? <div className="mt-1.5 text-[11.5px] leading-snug text-(--ink-soft)">{entry.note}</div> : null}
            </div>
          );
        })}
      </div>
    </GenCard>
  );
}
