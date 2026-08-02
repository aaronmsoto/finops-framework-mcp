// Thin JSON-RPC-over-HTTP client for the demo (browser fetch only — see
// src/workers/demo-requests.test.ts for the Node-side equivalent that talks
// to the worker fetch handler directly instead of over the network).

export async function sendRpc(url, body) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(
      `Could not reach ${url}: ${e instanceof Error ? e.message : String(e)}. ` +
        "Check the Worker URL, and that this page's origin is on the " +
        "Worker's ALLOWED_ORIGINS (the same setting also drives the CORS " +
        "headers the browser needs to read the response — see " +
        "docs/deploy-worker.md). If the allowlist looks right, this may " +
        "also be a network error unrelated to CORS.",
    );
  }
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `Non-JSON response (HTTP ${res.status}): ${text.slice(0, 300)}`,
    );
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
  }
  if (json.error) {
    throw new Error(`JSON-RPC error ${json.error.code}: ${json.error.message}`);
  }
  return json.result;
}

/** Unwraps a tools/call result, throwing the tool's own error text if the
 * call failed (isError), otherwise returning structuredContent. */
export function unwrapToolResult(result) {
  if (result?.isError) {
    const text =
      (result.content ?? [])
        .map((c) => c.text)
        .filter(Boolean)
        .join("\n") || "tool call failed";
    throw new Error(text);
  }
  return result?.structuredContent ?? {};
}
