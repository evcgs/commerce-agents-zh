// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

import { AssistantPanel as PanelShell, type MerchantChat, type Prefill, t } from "web-shared";
import type { StagedChange } from "@/lib/types";
import GenerativeBlock from "./generative";

const COPY = {
  title: t("Merchant assistant", "商家助手"),
  intro: t("Ask about performance, inventory, pricing, or campaigns.", "可以问我业绩、库存、定价或活动。"),
  starters: [
    t("What needs my attention this morning?", "今天早上有什么需要我关注？"),
    t("How did sales do this week compared to last?", "本周销售比上周怎么样？"),
    t("Which listings are running low on stock?", "哪些商品快断货了？"),
    t("Which slow movers should we mark down?", "哪些滞销品该降价？"),
  ],
  label: t("Message the merchant assistant", "给商家助手发消息"),
  placeholder: t("Ask about sales, stock, pricing…", "问我销售、库存、定价……"),
};

export default function AssistantPanel({
  chat,
  prefill,
  onPrefill,
  ...shell
}: {
  chat: MerchantChat<StagedChange>;
  prefill: Prefill | null;
  onPrefill: (text: string) => void;
  newMemoryCount: number;
  onOpenActivity: () => void;
  onClose: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  return (
    <PanelShell
      chat={chat}
      copy={COPY}
      prefill={prefill}
      renderBlock={(segment) => (
        <GenerativeBlock
          block={segment.block}
          status={segment.status}
          onChangeAction={chat.actOnChange}
          onPrefill={onPrefill}
        />
      )}
      {...shell}
    />
  );
}
