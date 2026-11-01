// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import { AgentApi, t } from "web-shared";
import type { AlertsResponse, ListingDetailResponse, ListingsResponse, OverviewResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const api = new AgentApi(API_URL, "/api/merchant");

export const UNREACHABLE = t(
  "Couldn't reach the retail API on port 8000. Start it with " +
    "`uvicorn retail.api.main:app --app-dir examples --port 8000` and try again.",
  "无法连接 8000 端口上的零售 API。请先运行 " +
    "`uvicorn retail.api.main:app --app-dir examples --port 8000` 再重试。",
);

export function fetchOverview(): Promise<OverviewResponse | null> {
  return api.get<OverviewResponse>("/overview");
}

export function fetchListings(query?: string): Promise<ListingsResponse | null> {
  return api.get<ListingsResponse>("/listings", query ? { query } : undefined);
}

export function fetchListingDetail(listingId: string): Promise<ListingDetailResponse | null> {
  return api.get<ListingDetailResponse>(`/listings/${encodeURIComponent(listingId)}`);
}

export function fetchAlerts(): Promise<AlertsResponse | null> {
  return api.get<AlertsResponse>("/alerts");
}

// ---- Model settings (commerce-agents-zh) -------------------------------------------
// The demo API's /api/models routes live outside the merchant prefix: they govern both
// agents. Key values are write-only — the API returns the stored key masked.

export type ModelSettings = {
  defaults: Record<string, string | null>;
  override: Record<string, string>;
  effective: Record<string, string | null>;
  locale: string;
};

export async function fetchModels(): Promise<ModelSettings | null> {
  const response = await fetch(`${API_URL}/api/models`);
  return response.ok ? ((await response.json()) as ModelSettings) : null;
}

export async function saveModels(fields: Record<string, string>): Promise<ModelSettings | null> {
  const response = await fetch(`${API_URL}/api/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  return response.ok ? ((await response.json()) as ModelSettings) : null;
}

export async function resetModels(): Promise<ModelSettings | null> {
  const response = await fetch(`${API_URL}/api/models`, { method: "DELETE" });
  return response.ok ? ((await response.json()) as ModelSettings) : null;
}

// ---- Prompt sheet (commerce-agents-zh) ----------------------------------------------
// The demo API's /api/prompts routes render what the agents actually send under the
// active locale, model settings, and overrides — and store a static-system override.

export type PromptLayerInfo = { name: string; chars: number; overridden: boolean };

export type PromptOverview = {
  agents: Record<
    string,
    { layers: PromptLayerInfo[]; model: string; overridden: boolean }
  >;
};

export type PromptContent = {
  agent: string;
  layer: string;
  content: string;
  overridden: boolean;
};

export async function fetchPromptOverview(): Promise<PromptOverview | null> {
  const response = await fetch(`${API_URL}/api/prompts`);
  return response.ok ? ((await response.json()) as PromptOverview) : null;
}

export async function fetchPromptContent(
  agent: string,
  layer: string,
): Promise<PromptContent | null> {
  const response = await fetch(
    `${API_URL}/api/prompts/content?agent=${encodeURIComponent(agent)}&layer=${encodeURIComponent(layer)}`,
  );
  return response.ok ? ((await response.json()) as PromptContent) : null;
}

export async function savePromptOverride(
  agent: string,
  staticSystem: string,
): Promise<PromptOverview | null> {
  const response = await fetch(`${API_URL}/api/prompts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent, static_system: staticSystem }),
  });
  return response.ok ? ((await response.json()) as PromptOverview) : null;
}

export async function resetPromptOverride(agent: string): Promise<PromptOverview | null> {
  const response = await fetch(`${API_URL}/api/prompts?agent=${encodeURIComponent(agent)}`, {
    method: "DELETE",
  });
  return response.ok ? ((await response.json()) as PromptOverview) : null;
}

export type PromptVersion = {
  index: number;
  ts: string;
  chars: number;
  note: string;
  prev_hash: string;
  text: string;
};

export async function fetchPromptVersions(
  agent: string,
): Promise<{ agent: string; versions: PromptVersion[] } | null> {
  const response = await fetch(
    `${API_URL}/api/prompts/versions?agent=${encodeURIComponent(agent)}`,
  );
  return response.ok
    ? ((await response.json()) as { agent: string; versions: PromptVersion[] })
    : null;
}

export async function restorePromptVersion(
  agent: string,
  index: number,
): Promise<PromptOverview | null> {
  const response = await fetch(`${API_URL}/api/prompts/restore-version`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent, index }),
  });
  return response.ok ? ((await response.json()) as PromptOverview) : null;
}

// ---- Data-source panel (commerce-agents-zh) -----------------------------------------
// The demo API's /api/backends routes pick where the storefront's product and policy
// data comes from. The API key is write-only: sending a blank one keeps the stored key.

export type BackendAdapter = {
  id: string;
  label: string;
  fields: string[];
  connected: boolean;
  degraded: boolean;
};

export type BackendHealth = {
  reads: number;
  failures: number;
  degraded: boolean;
  fallback_active: boolean;
};

export type BackendsStatus = {
  active: string;
  adapters: BackendAdapter[];
  health: BackendHealth;
};

export type PingResult = {
  ok: boolean;
  latency_ms: number;
  error: string | null;
};

export async function fetchBackends(): Promise<BackendsStatus | null> {
  const response = await fetch(`${API_URL}/api/backends`);
  return response.ok ? ((await response.json()) as BackendsStatus) : null;
}

export async function saveBackends(
  active: string,
  connection: Record<string, string>,
): Promise<BackendsStatus | null> {
  const response = await fetch(`${API_URL}/api/backends`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active, connection }),
  });
  return response.ok ? ((await response.json()) as BackendsStatus) : null;
}

export async function resetBackends(): Promise<BackendsStatus | null> {
  const response = await fetch(`${API_URL}/api/backends`, { method: "DELETE" });
  return response.ok ? ((await response.json()) as BackendsStatus) : null;
}

export async function pingConnection(connection: Record<string, string>): Promise<PingResult | null> {
  const response = await fetch(`${API_URL}/api/backends/ping`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(connection), // flat, unlike save: {"base_url","api_key","timeout_s"}
  });
  return response.ok ? ((await response.json()) as PingResult) : null;
}
