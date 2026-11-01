// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0
// commerce-agents-zh: the merchant portal's prompt sheet. Shows what the agents
// actually send to the model — every layer rendered live under the active locale,
// model settings, and overrides — and lets the operator override an agent's static
// system prompt (restorable). The upstream prompt builders are never touched; a
// blank override restores what they build.

"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon, Sheet, t } from "web-shared";

import {
  fetchPromptContent,
  fetchPromptOverview,
  fetchPromptVersions,
  resetPromptOverride,
  restorePromptVersion,
  savePromptOverride,
  type PromptContent,
  type PromptOverview,
  type PromptVersion,
} from "@/lib/api";

type AgentKind = "shopping" | "merchant";

const AGENT_LABELS: Record<AgentKind, () => string> = {
  shopping: () => t("Shopping Agent", "购物 Agent"),
  merchant: () => t("Merchant Agent", "商家 Agent"),
};

const LAYER_LABELS: Record<string, () => string> = {
  static: () => t("Static system prompt", "静态系统提示词"),
  dynamic: () => t("Dynamic context (sample)", "动态上下文（样例）"),
  tools: () => t("Tool definitions", "工具定义"),
  skills: () => t("Skills (full text)", "技能全文"),
  memory: () => t("Memory extraction prompt", "记忆提取提示词"),
  analysis: () => t("Analysis sub-agent prompt", "分析子代理提示词"),
};

/** The entry control beside the language and model-settings toggles. */
export function PromptConfigButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={t("Prompts", "提示词")}
      aria-label={t("Prompts", "提示词")}
      className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-(--line) bg-(--well) text-(--ink-soft) transition-colors hover:text-(--ink)"
    >
      <Icon name="prompt" size={15} />
    </button>
  );
}

export function PromptViewerSheet({ onClose }: { onClose: () => void }) {
  const [overview, setOverview] = useState<PromptOverview | null>(null);
  const [agent, setAgent] = useState<AgentKind>("shopping");
  const [layer, setLayer] = useState("static");
  const [content, setContent] = useState<PromptContent | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);

  const loadOverview = useCallback(async (keepAgent: AgentKind, keepLayer: string) => {
    const next = await fetchPromptOverview();
    if (next) {
      setOverview(next);
      // The layer may not exist for the agent in view; fall back to its first one.
      const names = next.agents[keepAgent]?.layers.map((item) => item.name) ?? [];
      if (!names.includes(keepLayer)) setLayer(names[0] ?? "static");
    } else {
      setFailed(true);
    }
    return next;
  }, []);

  useEffect(() => {
    void loadOverview(agent, layer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let live = true;
    setCopied(false);
    setEditing(false);
    setSavedNote(false);
    fetchPromptContent(agent, layer).then((next) => {
      if (live) setContent(next);
    });
    return () => {
      live = false;
    };
  }, [agent, layer, overview]);

  // The version timeline (static layer only): reload when the agent or layer changes.
  useEffect(() => {
    if (layer !== "static") {
      setVersions([]);
      setPreviewIdx(null);
      return;
    }
    let live = true;
    fetchPromptVersions(agent).then((next) => {
      if (live) setVersions(next?.versions ?? []);
    });
    return () => {
      live = false;
    };
  }, [agent, layer]);

  const info = overview?.agents[agent];
  const isStatic = layer === "static";

  const copy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content.content);
      setCopied(true);
    } catch {
      // A clipboard refusal is not worth an error surface; the text is selectable.
    }
  };

  const save = async () => {
    setSaving(true);
    const next = await savePromptOverride(agent, draft);
    setSaving(false);
    if (next) {
      setOverview(next);
      setEditing(false);
      setSavedNote(true);
      fetchPromptVersions(agent).then((v) => v && setVersions(v.versions));
    } else {
      setFailed(true);
    }
  };

  const restore = async () => {
    setSaving(true);
    const next = await resetPromptOverride(agent);
    setSaving(false);
    if (next) {
      setOverview(next);
      setEditing(false);
      setSavedNote(true);
      fetchPromptVersions(agent).then((v) => v && setVersions(v.versions));
    } else {
      setFailed(true);
    }
  };

  // Roll an agent's static prompt back to a historical version (P3 — version management).
  const restoreVersion = async (index: number) => {
    setRestoring(true);
    const next = await restorePromptVersion(agent, index);
    setRestoring(false);
    if (next) {
      setOverview(next);
      setEditing(false);
      setSavedNote(true);
      setPreviewIdx(null);
      fetchPromptVersions(agent).then((v) => v && setVersions(v.versions));
    } else {
      setFailed(true);
    }
  };

  return (
    <Sheet title={t("Prompts", "提示词")} onClose={onClose}>
      {failed ? (
        <p className="rounded-[10px] bg-(--danger-soft) p-3 text-[12.5px] text-(--danger)">
          {t("Couldn't reach the API on port 8000, so the prompts are unknown.", "连不上 8000 端口的 API，提示词未知。")}
        </p>
      ) : null}

      <p className="text-[12px] leading-relaxed text-(--ink-soft)">
        {t(
          "What the agents send to the model right now, under the active language, model settings, and overrides.",
          "Agent 当前实际发给模型的内容，跟随当前语言、模型配置与覆盖。",
        )}
      </p>

      {/* Agent tabs */}
      <div className="flex gap-1.5">
        {(["shopping", "merchant"] as AgentKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setAgent(kind)}
            className={`h-[30px] flex-1 rounded-[9px] border text-[12.5px] font-medium transition-colors ${
              agent === kind
                ? "border-(--accent) bg-(--accent-soft) text-(--ink)"
                : "border-(--line) bg-(--surface) text-(--ink-soft) hover:text-(--ink)"
            }`}
          >
            {AGENT_LABELS[kind]()}
            {overview?.agents[kind]?.overridden ? " ✏️" : ""}
          </button>
        ))}
      </div>

      {/* Layer list */}
      <div className="flex flex-wrap gap-1.5">
        {(info?.layers ?? []).map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => setLayer(item.name)}
            className={`flex h-[28px] items-center gap-1.5 rounded-full border px-3 text-[12px] transition-colors ${
              layer === item.name
                ? "border-(--accent) bg-(--accent-soft) font-semibold text-(--ink)"
                : "border-(--line) bg-(--surface) text-(--ink-soft) hover:text-(--ink)"
            }`}
          >
            {LAYER_LABELS[item.name]()}
            <span className="text-[10.5px] tabular-nums opacity-70">
              {(item.chars / 1000).toFixed(1)}k
            </span>
            {item.overridden ? <span title={t("Overridden", "已覆盖")}>✏️</span> : null}
          </button>
        ))}
      </div>

      {/* The rendered layer */}
      {content ? (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-(--ink)">
              {LAYER_LABELS[content.layer]()}
              {content.overridden ? (
                <span className="ml-2 rounded-full bg-(--accent-soft) px-2 py-0.5 text-[10.5px] font-semibold text-(--ink)">
                  {t("override in effect", "覆盖生效中")}
                </span>
              ) : null}
            </h3>
            <button
              type="button"
              onClick={() => void copy()}
              className="flex h-[26px] items-center gap-1 rounded-[8px] border border-(--line) px-2.5 text-[11.5px] text-(--ink-soft) transition-colors hover:text-(--ink)"
            >
              <Icon name={copied ? "check" : "expand"} size={12} />
              {copied ? t("Copied", "已复制") : t("Copy", "复制")}
            </button>
          </div>
          <pre className="max-h-[45vh] overflow-auto whitespace-pre-wrap rounded-[10px] border border-(--line) bg-(--well) p-3 font-mono text-[11px] leading-relaxed text-(--ink)">
            {content.content}
          </pre>
        </section>
      ) : !failed ? (
        <p className="rounded-[10px] bg-(--well) p-3 text-[12.5px] text-(--ink-soft)">
          {t("Rendering…", "渲染中…")}
        </p>
      ) : null}

      {/* The static-system override (P1) */}
      {isStatic ? (
        editing ? (
          <section className="flex flex-col gap-2 rounded-[12px] border border-(--line) p-3.5">
            <h3 className="text-[13px] font-semibold text-(--ink)">
              {t("Override the static prompt", "覆盖静态提示词")}
            </h3>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              className="w-full resize-y rounded-[9px] border border-(--line) bg-(--surface) p-2.5 font-mono text-[11.5px] leading-relaxed text-(--ink) outline-none placeholder:text-(--ink-soft) focus:border-(--accent)"
              placeholder={t("Paste the full replacement prompt…", "粘贴完整替换提示词…")}
            />
            <p className="text-[11.5px] leading-tight text-(--ink-soft)">
              {t(
                "Applied by rebuilding both agents; stored in data/prompt-override.json (gitignored). A blank save restores the prompt upstream builds.",
                "保存后重建两个 Agent 生效；存储在 data/prompt-override.json（已 gitignore）。保存空白内容即恢复上游默认提示词。",
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="btn-primary flex h-[34px] flex-1 items-center justify-center rounded-[10px] text-[12.5px] font-semibold disabled:opacity-50"
              >
                {saving ? t("Applying…", "应用中…") : t("Save & apply", "保存并生效")}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex h-[34px] items-center justify-center rounded-[10px] border border-(--line) px-3 text-[12.5px] font-medium text-(--ink-soft) transition-colors hover:text-(--ink)"
              >
                {t("Cancel", "取消")}
              </button>
            </div>
          </section>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(content?.content ?? "");
                setEditing(true);
              }}
              className="flex h-[34px] flex-1 items-center justify-center rounded-[10px] border border-(--line) text-[12.5px] font-medium text-(--ink-soft) transition-colors hover:text-(--ink)"
            >
              {info?.overridden ? t("Edit override", "编辑覆盖") : t("Override this prompt", "覆盖此提示词")}
            </button>
            {info?.overridden ? (
              <button
                type="button"
                onClick={() => void restore()}
                disabled={saving}
                className="flex h-[34px] items-center justify-center rounded-[10px] border border-(--line) px-3 text-[12.5px] font-medium text-(--ink-soft) transition-colors hover:text-(--ink) disabled:opacity-50"
              >
                {t("Restore default", "恢复默认")}
              </button>
            ) : null}
          </div>
        )
      ) : null}

      {/* Static-system prompt history (P3 — version management, static layer only) */}
      {isStatic ? (
        <section className="flex flex-col gap-2 rounded-[12px] border border-(--line) p-3.5">
          <h3 className="text-[13px] font-semibold text-(--ink)">
            {t("Prompt history", "提示词历史版本")}
          </h3>
          {versions.length === 0 ? (
            <p className="text-[11.5px] leading-tight text-(--ink-soft)">
              {t(
                "No saved edits yet — your first override will start a timeline.",
                "暂无保存记录——首次覆盖将开始一条时间线。",
              )}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {versions.map((v) => (
                <li
                  key={v.index}
                  className="rounded-[9px] border border-(--line) bg-(--surface) p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11.5px] font-medium text-(--ink)">
                      #{v.index}
                      <span className="ml-2 text-[10.5px] tabular-nums text-(--ink-soft)">
                        {v.ts.replace("T", " ").split(".")[0]}
                      </span>
                      <span className="ml-2 text-[10.5px] tabular-nums text-(--ink-soft)">
                        {(v.chars / 1000).toFixed(1)}k
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewIdx(previewIdx === v.index ? null : v.index)
                        }
                        className="flex h-[24px] items-center rounded-[7px] border border-(--line) px-2 text-[11px] text-(--ink-soft) transition-colors hover:text-(--ink)"
                      >
                        {previewIdx === v.index ? t("Hide", "收起") : t("Preview", "预览")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void restoreVersion(v.index)}
                        disabled={restoring}
                        className="flex h-[24px] items-center rounded-[7px] border border-(--line) px-2 text-[11px] text-(--ink-soft) transition-colors hover:text-(--ink) disabled:opacity-50"
                      >
                        {t("Roll back", "回滚")}
                      </button>
                    </div>
                  </div>
                  {v.note ? (
                    <p className="mt-1 text-[11px] leading-tight text-(--ink-soft)">
                      {v.note}
                    </p>
                  ) : null}
                  {previewIdx === v.index ? (
                    <pre className="mt-2 max-h-[30vh] overflow-auto whitespace-pre-wrap rounded-[8px] border border-(--line) bg-(--well) p-2.5 font-mono text-[10.5px] leading-relaxed text-(--ink)">
                      {v.text}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {savedNote ? (
        <p className="rounded-[10px] bg-(--well) p-2.5 text-[12.5px] text-(--ink-soft)">
          {t("Applied — the agent now runs under this prompt.", "已生效——Agent 已按此提示词运行。")}
        </p>
      ) : null}
    </Sheet>
  );
}
