// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { CHANGE_STATUS, DigestList, DigestRow, formatMoney, formatNumber, GenCard, GenCardHeader, type IconName, plural, t, type Tone } from "web-shared";
import { INVENTORY_KINDS } from "@/lib/kinds";
import type { DigestEntry, DigestPayload } from "@/lib/types";

const KINDS: Record<DigestEntry["kind"], { icon: IconName; tone: Tone }> = {
  ...INVENTORY_KINDS,
  order_issue: { icon: "inbox", tone: "danger" },
  metric: { icon: "chart", tone: "ok" },
  pending_change: { icon: "edit", tone: "violet" },
  note: { icon: "message", tone: "muted" },
};

/** Pending changes get no chip; approval stays on the change card. */
function triagePrompt(item: DigestEntry): { label: string; prompt: string } | null {
  const listingRef = item.listing ? `${item.listing.title} (${item.listing.listing_id})` : item.ref_id;
  switch (item.kind) {
    case "low_stock":
      return listingRef ? { label: t("Draft restock", "起草补货"), prompt: t(`Draft a restock plan for ${listingRef}.`, `为 ${listingRef} 起草一份补货方案。`) } : null;
    case "slow_mover":
      return listingRef ? { label: t("Plan markdown", "规划降价"), prompt: t(`Plan a markdown for ${listingRef}.`, `为 ${listingRef} 规划一次降价。`) } : null;
    case "order_issue":
      return {
        label: t("Draft reply", "起草回复"),
        prompt: item.ref_id
          ? t(`Help me handle order ${item.ref_id}: ${item.headline}`, `帮我处理订单 ${item.ref_id}：${item.headline}`)
          : t(`Help me handle this order issue: ${item.headline}`, `帮我处理这个订单问题：${item.headline}`),
      };
    case "metric":
      return { label: t("Ask why", "问原因"), prompt: t(`What's driving this: ${item.headline}?`, `是什么在推动这个变化：${item.headline}？`) };
    default:
      return null;
  }
}

function context(item: DigestEntry) {
  if (item.listing) {
    return (
      <span>
        {item.listing.listing_id} · {item.listing.stock === 0 ? t("sold out", "已售罄") : t(`${formatNumber(item.listing.stock)} in stock`, `库存 ${formatNumber(item.listing.stock)}`)} · {formatMoney(item.listing.price)}
      </span>
    );
  }
  if (item.change) {
    return (
      <span>
        {item.change.change_id} · {CHANGE_STATUS[item.change.status].label}
      </span>
    );
  }
  return null;
}

export default function DigestCard({ payload, onPrefill }: { payload: DigestPayload; onPrefill?: (text: string) => void }) {
  const items = payload.items ?? [];
  return (
    <GenCard>
      <GenCardHeader title={payload.title ?? t("Needs attention", "需要关注")} aside={t(plural(items.length, "item"), `${formatNumber(items.length)} 项`)} />
      <DigestList>
        {items.map((item, index) => {
          const triage = onPrefill ? triagePrompt(item) : null;
          const style = KINDS[item.kind] ?? KINDS.note;
          const soldOut = item.kind === "low_stock" && item.listing?.stock === 0;
          return (
            <DigestRow
              key={`${item.ref_id ?? item.headline}-${index}`}
              icon={style.icon}
              tone={soldOut ? "danger" : style.tone}
              headline={item.headline}
              why={item.why_it_matters}
              context={context(item)}
              action={triage ? { label: triage.label, onClick: () => onPrefill?.(triage.prompt) } : null}
            />
          );
        })}
      </DigestList>
    </GenCard>
  );
}
