// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0
// commerce-agents-zh: the merchant portal's model-settings entry. A sheet that shows
// what the agents run with, lets the operator override the model names, the thinking
// effort, and the API endpoint, and applies the change by rebuilding both agents.
// The upstream defaults in the config files are never touched; clearing the stored
// override restores them.

"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon, Sheet, t } from "web-shared";

import { fetchModels, resetModels, saveModels, type ModelSettings } from "@/lib/api";

const EFFORTS = ["off", "low", "medium", "high", "xhigh", "max"] as const;

const FIELD_LABELS = {
  model: () => t("Shopping model", "购物 Agent 模型"),
  merchant_model: () => t("Merchant model", "商家 Agent 模型"),
  memory_model: () => t("Memory model", "记忆提取模型"),
  analysis_model: () => t("Analysis model", "分析子代理模型"),
  thinking_effort: () => t("Thinking effort", "思考档位"),
  base_url: () => t("API base URL", "API 接入点"),
  api_key: () => t("API key", "API Key"),
} as const;

/** The entry control beside the language toggle. */
export function ModelConfigButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={t("Model settings", "模型配置")}
      aria-label={t("Model settings", "模型配置")}
      className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-(--line) bg-(--well) text-(--ink-soft) transition-colors hover:text-(--ink)"
    >
      <Icon name="edit" size={15} />
    </button>
  );
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

const inputClass =
  "h-[36px] rounded-[9px] border border-(--line) bg-(--surface) px-3 text-[13px] text-(--ink) outline-none placeholder:text-(--ink-soft) focus:border-(--accent)";

export function ModelConfigSheet({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<ModelSettings | null>(null);
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const next = await fetchModels();
    if (next) setStatus(next);
    else setFailed(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    const next = await saveModels(form);
    setSaving(false);
    if (next) {
      setStatus(next);
      setForm({});
      setSaved(true);
    } else {
      setFailed(true);
    }
  };

  const reset = async () => {
    setSaving(true);
    const next = await resetModels();
    setSaving(false);
    if (next) {
      setStatus(next);
      setForm({});
      setSaved(true);
    } else {
      setFailed(true);
    }
  };

  const effective = status?.effective;
  const override = status?.override ?? {};
  const eff = (key: keyof ModelSettings["effective"]) => String(effective?.[key] ?? "—");
  const ov = (key: string) => String(override[key] ?? "");

  return (
    <Sheet title={t("Model settings", "模型配置")} onClose={onClose}>
      {failed ? (
        <p className="rounded-[10px] bg-(--danger-soft) p-3 text-[12.5px] text-(--danger)">
          {t("Couldn't reach the API on port 8000, so the current settings are unknown.", "连不上 8000 端口的 API，当前配置未知。")}
        </p>
      ) : null}

      {/* What the agents run with right now */}
      <section className="flex flex-col gap-2 rounded-[12px] border border-(--line) bg-(--well) p-3.5">
        <h3 className="text-[13px] font-semibold text-(--ink)">{t("Running now", "当前生效")}</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
          <dt className="text-(--ink-soft)">{FIELD_LABELS.model()}</dt>
          <dd className="truncate text-right font-medium text-(--ink)">{eff("model")}</dd>
          <dt className="text-(--ink-soft)">{FIELD_LABELS.merchant_model()}</dt>
          <dd className="truncate text-right font-medium text-(--ink)">{eff("merchant_model")}</dd>
          <dt className="text-(--ink-soft)">{FIELD_LABELS.memory_model()}</dt>
          <dd className="truncate text-right font-medium text-(--ink)">{eff("memory_model")}</dd>
          <dt className="text-(--ink-soft)">{FIELD_LABELS.thinking_effort()}</dt>
          <dd className="truncate text-right font-medium text-(--ink)">
            {effective?.thinking_effort ?? t("off", "关")}
          </dd>
          <dt className="text-(--ink-soft)">{FIELD_LABELS.base_url()}</dt>
          <dd className="truncate text-right font-medium text-(--ink)">
            {effective?.base_url ?? t("SDK environment (env)", "SDK 环境变量")}
          </dd>
        </dl>
      </section>

      {/* The override form */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] font-semibold text-(--ink)">{t("Override", "覆盖配置")}</h3>
        <Row
          label={FIELD_LABELS.model()}
          hint={t("Stored locally and applied to both new sessions; blank keeps the default.", "保存在本地并对新会话生效；留空保持默认。")}
        >
          <input className={inputClass} value={form.model ?? ""} onChange={(e) => set("model", e.target.value)} placeholder={t("e.g. gpt-5.5, deepseek-v4-pro", "如 gpt-5.5、deepseek-v4-pro")} />
        </Row>
        <Row label={FIELD_LABELS.merchant_model()}>
          <input className={inputClass} value={form.merchant_model ?? ""} onChange={(e) => set("merchant_model", e.target.value)} placeholder={ov("merchant_model") || t("default", "默认")} />
        </Row>
        <Row label={FIELD_LABELS.memory_model()}>
          <input className={inputClass} value={form.memory_model ?? ""} onChange={(e) => set("memory_model", e.target.value)} placeholder={ov("memory_model") || t("default", "默认")} />
        </Row>
        <Row label={FIELD_LABELS.analysis_model()} hint={t("The merchant portal's analysis delegate.", "商家门户的分析子代理。")}>
          <input className={inputClass} value={form.analysis_model ?? ""} onChange={(e) => set("analysis_model", e.target.value)} placeholder={ov("analysis_model") || t("inherits the merchant model", "继承商家模型")} />
        </Row>
        <Row label={FIELD_LABELS.thinking_effort()}>
          <select className={inputClass} value={form.thinking_effort ?? ""} onChange={(e) => set("thinking_effort", e.target.value)}>
            <option value="">{t("keep current", "保持当前")}</option>
            {EFFORTS.map((value) => (
              <option key={value} value={value}>
                {value === "off" ? t("off (default)", "关（默认）") : value}
              </option>
            ))}
          </select>
        </Row>
        <Row
          label={FIELD_LABELS.base_url()}
          hint={t("Any Anthropic-Messages-compatible endpoint (new-api / one-api relays included).", "任意兼容 Anthropic Messages 协议的端点（含 new-api / one-api 中转）。")}
        >
          <input className={inputClass} value={form.base_url ?? ""} onChange={(e) => set("base_url", e.target.value)} placeholder={ov("base_url") || t("SDK environment (env)", "SDK 环境变量")} />
        </Row>
        <Row
          label={FIELD_LABELS.api_key()}
          hint={t("Write-only: stored in data/model-override.json (gitignored) and sent only to the endpoint above. Leave blank to keep the stored one.", "只写不回显：保存在 data/model-override.json（已 gitignore），只发给上方接入点。留空保持已存 key。")}
        >
          <input className={inputClass} type="password" value={form.api_key ?? ""} onChange={(e) => set("api_key", e.target.value)} placeholder={ov("api_key") ? t("stored (••••)", "已保存（••••）") : t("SDK environment (env)", "SDK 环境变量")} />
        </Row>
      </section>

      {saved ? (
        <p className="rounded-[10px] bg-(--well) p-2.5 text-[12.5px] text-(--ink-soft)">
          {t("Applied — both agents were rebuilt under these settings.", "已生效——两个 Agent 已按此配置重建。")}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !status}
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
          {t("Restore defaults", "恢复默认")}
        </button>
      </div>
    </Sheet>
  );
}
