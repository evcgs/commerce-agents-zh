// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0
// commerce-agents-zh: the merchant portal's data-source entry. A sheet that shows where
// the storefront's product and policy data comes from, lets the operator switch between
// the built-in demo data and a remote catalog, test the connection, and apply the change
// by rebuilding the agents. The upstream defaults are never touched; restoring them
// switches back to the built-in data.

"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon, Sheet, t } from "web-shared";

import {
  fetchBackends,
  pingConnection,
  resetBackends,
  saveBackends,
  type BackendsStatus,
  type PingResult,
} from "@/lib/api";

/** The entry control beside the language toggle. */
export function BackendConfigButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={t("Data source", "数据源")}
      aria-label={t("Data source", "数据源")}
      className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-(--line) bg-(--well) text-(--ink-soft) transition-colors hover:text-(--ink)"
    >
      <Icon name="connector" size={15} />
    </button>
  );
}

function Dot({ tone }: { tone: "ok" | "warn" }) {
  return <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${tone === "ok" ? "bg-(--ok)" : "bg-(--warn)"}`} />;
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-(--ink)">{label}</span>
      {children}
      {hint ? <span className="text-[11.5px] leading-tight text-(--ink-soft)">{hint}</span> : null}
    </label>
  );
}

const FIELD_LABELS = {
  base_url: () => t("Base URL", "接入点地址"),
  api_key: () => t("API key", "API Key"),
  timeout_s: () => t("Timeout (seconds)", "超时秒数"),
} as const;

const inputClass =
  "h-[36px] rounded-[9px] border border-(--line) bg-(--surface) px-3 text-[13px] text-(--ink) outline-none placeholder:text-(--ink-soft) focus:border-(--accent)";

/** Write-only like the model key: blanks are dropped, so a blank api_key keeps the stored one. */
function connectionPayload(form: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(form)) {
    if (value.trim()) out[key] = value.trim();
  }
  return out;
}

export function BackendConfigSheet({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<BackendsStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [ping, setPing] = useState<PingResult | null>(null);
  const [pinging, setPinging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const next = await fetchBackends();
    if (next) setStatus(next);
    else setFailed(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Default the radio to the adapter currently in force once the status arrives.
  useEffect(() => {
    setSelected((prev) => prev ?? status?.active ?? null);
  }, [status]);

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setPing(null);
  };

  const choose = (id: string) => {
    setSelected(id);
    setForm({});
    setPing(null);
    setSaved(false);
  };

  const test = async () => {
    setPinging(true);
    const next = await pingConnection(connectionPayload(form));
    setPinging(false);
    setPing(next ?? { ok: false, latency_ms: 0, error: t("Couldn't reach the API on port 8000.", "连不上 8000 端口的 API。") });
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const next = await saveBackends(selected, connectionPayload(form));
    setSaving(false);
    if (next) {
      setStatus(next);
      setForm({});
      setPing(null);
      setSaved(true);
    } else {
      setFailed(true);
    }
  };

  const reset = async () => {
    setSaving(true);
    const next = await resetBackends();
    setSaving(false);
    if (next) {
      setStatus(next);
      setSelected(next.active);
      setForm({});
      setPing(null);
      setSaved(true);
    } else {
      setFailed(true);
    }
  };

  const active = status?.adapters.find((item) => item.id === status.active);
  const health = status?.health;
  const fieldsSummary = (fields: string[]) =>
    fields.length ? fields.map((name) => FIELD_LABELS[name as keyof typeof FIELD_LABELS]?.() ?? name).join(" · ") : t("no configuration needed", "无需配置");

  return (
    <Sheet title={t("Data source", "数据源")} onClose={onClose}>
      {failed ? (
        <p className="rounded-[10px] bg-(--danger-soft) p-3 text-[12.5px] text-(--danger)">
          {t("Couldn't reach the API on port 8000, so the current data source is unknown.", "连不上 8000 端口的 API，当前数据源未知。")}
        </p>
      ) : null}

      <p className="text-[12px] leading-relaxed text-(--ink-soft)">
        {t("Where the storefront's product and policy data comes from.", "店面的商品与政策数据来自哪里。")}
      </p>

      <a
        href="https://github.com/evcgs/commerce-agents-zh/blob/main/docs/%E6%95%B0%E6%8D%AE%E6%BA%90%E9%85%8D%E7%BD%AE%E5%B8%AE%E5%8A%A9.md"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[11.5px] font-medium text-(--accent) hover:underline"
      >
        ? {t("Remote catalog setup help", "远端目录配置帮助")}
      </a>

      {/* The data source the storefront reads right now */}
      {active && health ? (
        <section className="flex flex-col gap-2 rounded-[12px] border border-(--line) bg-(--well) p-3.5">
          <h3 className="text-[13px] font-semibold text-(--ink)">{t("Running now", "当前生效")}</h3>
          <div className="flex items-center gap-2 text-[12.5px]">
            <Dot tone={health.degraded ? "warn" : "ok"} />
            <span className="font-medium text-(--ink)">{active.label}</span>
          </div>
          <p className="text-[11.5px] tabular-nums text-(--ink-soft)">
            {health.reads} {t("reads", "次读取")} · {health.failures} {t("failures", "次失败")}
          </p>
          {health.fallback_active ? (
            <p className="text-[12px] font-medium text-(--warn)">
              {t("fallback to local data", "已降级到本地数据")}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* The adapter radio list */}
      <section className="flex flex-col gap-1.5">
        <h3 className="text-[13px] font-semibold text-(--ink)">{t("Adapter", "适配器")}</h3>
        {(status?.adapters ?? []).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => choose(item.id)}
            className={`flex flex-col gap-0.5 rounded-[10px] border px-3 py-2 text-left transition-colors ${
              selected === item.id
                ? "border-(--accent) bg-(--accent-soft)"
                : "border-(--line) bg-(--surface) hover:border-(--ink-soft)"
            }`}
          >
            <span className="flex items-center gap-2 text-[13px] font-medium text-(--ink)">
              <Dot tone={item.connected ? "ok" : "warn"} />
              {item.label}
            </span>
            <span className="pl-4 text-[11.5px] text-(--ink-soft)">{fieldsSummary(item.fields)}</span>
          </button>
        ))}
      </section>

      {/* The remote-catalog connection form */}
      {selected === "remote-catalog" ? (
        <section className="flex flex-col gap-3 rounded-[12px] border border-(--line) p-3.5">
          <h3 className="text-[13px] font-semibold text-(--ink)">{t("Connection", "连接配置")}</h3>
          <Row
            label={FIELD_LABELS.base_url()}
            hint={t("The catalog service's base URL; blank keeps the configured one.", "商品目录服务的接入点地址；留空保持已配置地址。")}
          >
            <input className={inputClass} value={form.base_url ?? ""} onChange={(e) => set("base_url", e.target.value)} placeholder="http://127.0.0.1:8000" />
          </Row>
          <Row
            label={FIELD_LABELS.api_key()}
            hint={t("Write-only: stored on the API side (gitignored) and never echoed back. Leave blank to keep the stored one.", "只写不回显：保存在 API 侧（已 gitignore）。留空保持已存 key。")}
          >
            <input className={inputClass} type="password" value={form.api_key ?? ""} onChange={(e) => set("api_key", e.target.value)} placeholder="••••••" />
          </Row>
          <Row label={FIELD_LABELS.timeout_s()}>
            <input className={inputClass} type="number" min={1} value={form.timeout_s ?? ""} onChange={(e) => set("timeout_s", e.target.value)} placeholder={t("default", "默认")} />
          </Row>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void test()}
              disabled={pinging}
              className="flex h-[30px] items-center gap-1.5 rounded-[8px] border border-(--line) px-2.5 text-[12px] text-(--ink-soft) transition-colors hover:text-(--ink) disabled:opacity-50"
            >
              <Icon name={ping?.ok ? "check" : "expand"} size={12} />
              {pinging ? t("Testing…", "测试中…") : t("Test connection", "测试连接")}
            </button>
            {ping ? (
              ping.ok ? (
                <span className="text-[12px] font-medium text-(--ok)">
                  {t("ok", "正常")} · {ping.latency_ms} ms
                </span>
              ) : (
                <span className="truncate text-[12px] text-(--danger)">{ping.error ?? t("failed", "失败")}</span>
              )
            ) : null}
          </div>
        </section>
      ) : null}

      {saved ? (
        <p className="rounded-[10px] bg-(--well) p-2.5 text-[12.5px] text-(--ink-soft)">
          {t("Applied — the agents now read this data source.", "已生效——两个 Agent 已改为读取此数据源。")}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !selected}
          className="btn-primary flex h-[36px] flex-1 items-center justify-center rounded-[10px] text-[13px] font-semibold disabled:opacity-50"
        >
          {saving ? t("Applying…", "应用中…") : t("Save & apply", "保存并生效")}
        </button>
        <button
          type="button"
          onClick={() => void reset()}
          disabled={saving || !status}
          className="flex h-[36px] items-center justify-center rounded-[10px] border border-(--line) px-3 text-[13px] font-medium text-(--ink-soft) transition-colors hover:text-(--ink) disabled:opacity-50"
        >
          {t("Restore built-in data", "恢复内置数据")}
        </button>
      </div>
    </Sheet>
  );
}
