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

export interface WalkthroughStep {
  key: string;
  server: "framework" | "focus";
  title: string;
  goal: string;
  buildRequest: (id: number) => JsonRpcRequest;
}

export const STEPS: WalkthroughStep[];
