// Hand-written type declarations for requests.js (T-038). demo/ is a plain,
// no-build-step static app — this file exists only so
// src/workers/demo-requests.test.ts gets real types for the request
// builders it imports; it is never loaded at runtime by the browser or the
// worker.
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

export const CAPABILITY_SLUG: string;
export const DOMAIN_SLUG: string;
export const COMPARE_COLUMN: string;
export const FOCUS_VERSIONS: string[];
export const CALCULATE_VERSION: string;

export function listCapabilitiesRequest(id: number): JsonRpcRequest;
export function getCapabilityRequest(id: number): JsonRpcRequest;
export function kpiMappingRequest(id: number, version: string): JsonRpcRequest;
export function compareVersionsRequest(id: number): JsonRpcRequest;
export function calculateKpiRequest(
  id: number,
  kpiSlug: string,
  version?: string,
): JsonRpcRequest;

export type ServerName = "framework" | "focus" | "tokenomics";

export interface WalkthroughStep {
  key: string;
  server: ServerName;
  title: string;
  goal: string;
  buildRequest: (id: number) => JsonRpcRequest;
}

export const STEPS: WalkthroughStep[];

export interface CacheWorkload {
  cache_read_tokens: number;
  cache_write_tokens: number;
  uncached_input_tokens: number;
  base_input_price_per_mtok?: number;
  cache_read_multiplier?: number;
  cache_write_multiplier?: number;
  actual_prompt_cost?: number;
}

export const CACHE_KPI_SLUG: string;
export const CACHE_LEVER_SLUG: string;
export const FOCUS_CACHE_CARD: string;
export const FOCUS_CACHE_COLUMN: string;
export const DEFAULT_CACHE_WORKLOAD: Required<
  Omit<CacheWorkload, "actual_prompt_cost">
>;

export function frameworkCacheKpiRequest(id: number): JsonRpcRequest;
export function cacheMetricRequest(id: number): JsonRpcRequest;
export function cacheMetricsRequest(
  id: number,
  workload?: CacheWorkload,
): JsonRpcRequest;
export function cacheLeverRequest(id: number): JsonRpcRequest;
export function cacheCrosslinksRequest(id: number): JsonRpcRequest;
export function focusCacheColumnRequest(id: number): JsonRpcRequest;

export const AI_CACHING_STEPS: WalkthroughStep[];

export interface Walkthrough {
  title: string;
  servers: ServerName[];
  steps: WalkthroughStep[];
}

export const WALKTHROUGHS: Record<
  "rate-optimization" | "ai-caching",
  Walkthrough
>;
