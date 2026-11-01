// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { AskButton, coverLabel, formatNumber, KindIcon, MiniBar, Notice, optionValuesLabel, PageHeader, Panel, Pill, plural, Skeleton, t, useResource } from "web-shared";
import { fetchAlerts } from "@/lib/api";
import { INVENTORY_KINDS } from "@/lib/kinds";
import type { InventoryAlert } from "@/lib/types";

function AlertRow({ alert, onAskAssistant }: { alert: InventoryAlert; onAskAssistant: (text: string) => void }) {
  const style = INVENTORY_KINDS[alert.kind];
  const soldOut = alert.stock === 0;
  const low = alert.kind === "low_stock";
  const chosen = optionValuesLabel(alert);
  const name = chosen ? t(`${alert.title} in ${chosen}`, `${alert.title}（${chosen}）`) : alert.title;
  const prompt = low
    ? t(`Draft a restock plan for ${name} (${alert.listing_id}).`, `为 ${name}（${alert.listing_id}）起草一份补货方案。`)
    : t(`Plan a markdown for ${name} (${alert.listing_id}).`, `为 ${name}（${alert.listing_id}）规划一次降价。`);
  return (
    <li className="flex items-center gap-3 px-[18px] py-3">
      <KindIcon icon={style.icon} tone={soldOut ? "danger" : style.tone} />
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium leading-snug text-(--ink)">
          {alert.title}
          {chosen ? <span className="font-normal text-(--ink-soft)"> · {chosen}</span> : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] tabular-nums text-(--ink-soft)">
          <span>{alert.listing_id}</span>
          {alert.sales_last_30d != null ? <span>· {t(`${formatNumber(alert.sales_last_30d)} sold in 30 days`, `近 30 天售出 ${formatNumber(alert.sales_last_30d)}`)}</span> : null}
          {low && alert.threshold != null ? <span>· {t(`reorder at ${formatNumber(alert.threshold)}`, `补货点 ${formatNumber(alert.threshold)}`)}</span> : null}
          {low && alert.stock > 0 && alert.storefront_visible ? (
            <Pill tone="warn" dot>
              {t(`Storefront shows “Only ${formatNumber(alert.stock)} left”`, `店面显示“仅剩 ${formatNumber(alert.stock)} 件”`)}
            </Pill>
          ) : null}
          {soldOut && alert.storefront_visible === false ? <span>· {t("hidden from the storefront", "已从店面隐藏")}</span> : null}
        </div>
      </div>
      <div className="w-32 shrink-0 whitespace-nowrap text-right tabular-nums">
        <div className={`text-[15px] font-semibold ${soldOut ? "text-(--danger)" : low ? "text-(--warn)" : "text-(--ink)"}`}>
          {soldOut ? "0" : formatNumber(alert.stock)}
          <span className="ml-1 text-[11.5px] font-medium text-(--ink-soft)">{t("in stock", "件库存")}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[11.5px] text-(--ink-soft)">
          {/* Stock against the reorder threshold: empty at zero, full at twice the threshold. */}
          {low && alert.threshold ? <MiniBar value={alert.stock / (alert.threshold * 2)} tone={soldOut ? "danger" : "warn"} /> : null}
          {alert.days_of_cover != null && !soldOut ? <span>{coverLabel(alert.days_of_cover)}</span> : soldOut ? <span>{t("sold out", "已售罄")}</span> : null}
        </div>
      </div>
      <AskButton label={low ? t("Draft restock", "起草补货") : t("Plan markdown", "规划降价")} onClick={() => onAskAssistant(prompt)} />
    </li>
  );
}

export default function InventoryView({ refreshKey, onAskAssistant }: { refreshKey: number; onAskAssistant: (text: string) => void }) {
  const { data, failed } = useResource(fetchAlerts, [refreshKey]);

  const lowStock = (data?.inventory ?? [])
    .filter((alert) => alert.kind === "low_stock")
    .sort((a, b) => (a.days_of_cover ?? Infinity) - (b.days_of_cover ?? Infinity));
  const slowMovers = (data?.inventory ?? []).filter((alert) => alert.kind === "slow_mover");
  const tiedUp = slowMovers.reduce((sum, alert) => sum + alert.stock, 0);

  return (
    <div className="ac-reveal @container flex flex-col gap-4">
      <PageHeader
        title={t("Inventory", "库存")}
        subtitle={
          data
            ? t(
                `${lowStock.length} low or out of stock · ${plural(slowMovers.length, "slow mover")}${tiedUp ? ` with ${formatNumber(tiedUp)} units tied up` : ""}`,
                `${lowStock.length} 件低库存或缺货 · ${slowMovers.length} 个滞销品${tiedUp ? `，压货 ${formatNumber(tiedUp)} 件` : ""}`,
              )
            : undefined
        }
      />
      {failed && !data ? (
        <Notice>{t("The merchant API isn't reachable, so inventory alerts can't load.", "无法连接商家 API，库存预警加载失败。")}</Notice>
      ) : !data ? (
        <div className="grid gap-4 @4xl:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="grid items-start gap-4 @4xl:grid-cols-2">
          <Panel title={t("Low stock", "低库存")} subtitle={t("soonest to run out first", "最先断货的排前面")}>
            {lowStock.length === 0 ? (
              <p className="px-[18px] pb-4 text-[13.5px] text-(--ink-soft)">{t("No low-stock listings.", "没有低库存商品。")}</p>
            ) : (
              <ul className="divide-y divide-(--line)">
                {lowStock.map((alert) => (
                  <AlertRow key={alert.listing_id} alert={alert} onAskAssistant={onAskAssistant} />
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={t("Slow movers", "滞销品")} subtitle={t("stock well above the last 30 days of sales", "库存远高于近 30 天销量")}>
            {slowMovers.length === 0 ? (
              <p className="px-[18px] pb-4 text-[13.5px] text-(--ink-soft)">{t("No slow movers.", "没有滞销品。")}</p>
            ) : (
              <ul className="divide-y divide-(--line)">
                {slowMovers.map((alert) => (
                  <AlertRow key={alert.listing_id} alert={alert} onAskAssistant={onAskAssistant} />
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
