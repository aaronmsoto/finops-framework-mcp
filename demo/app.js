import { CONFIG, endpointUrl } from "./config.js";
import {
  AI_CACHING_STEPS,
  DEFAULT_CACHE_WORKLOAD,
  STEPS,
  cacheMetricsRequest,
  calculateKpiRequest,
} from "./requests.js";
import { sendRpc, unwrapToolResult } from "./client.js";

const runButton = document.getElementById("run");
const urlInput = document.getElementById("worker-url");
const log = document.getElementById("log");
const statusEl = document.getElementById("status");
const workloadEl = document.getElementById("workload");
const resultEl = document.getElementById("result");

urlInput.value = CONFIG.workerBaseUrl;

const WORKLOAD_FIELDS = Object.keys(DEFAULT_CACHE_WORKLOAD);

/** "churning": the prefix changes so often that most prompt tokens are
 * written to cache and almost never read back, so the 1.25× write premium
 * outweighs the 0.1× read discount and caching costs more than not caching. */
const PRESETS = {
  stable: DEFAULT_CACHE_WORKLOAD,
  churning: {
    ...DEFAULT_CACHE_WORKLOAD,
    cache_read_tokens: 100000,
    cache_write_tokens: 400000,
    uncached_input_tokens: 500000,
  },
};

let nextId = 1;

function selectedWalkthrough() {
  return (
    document.querySelector('input[name="walkthrough"]:checked')?.value ??
    "ai-caching"
  );
}

function applyPreset(workload) {
  for (const field of WORKLOAD_FIELDS) {
    document.getElementById(field).value = String(workload[field]);
  }
}

function workloadFromInputs() {
  const workload = {};
  for (const field of WORKLOAD_FIELDS) {
    const raw = document.getElementById(field).value.trim();
    const value = Number(raw);
    if (raw === "" || !Number.isFinite(value) || value < 0) {
      throw new Error(`${field} must be a non-negative number`);
    }
    workload[field] = value;
  }
  return workload;
}

function syncPicker() {
  const isCaching = selectedWalkthrough() === "ai-caching";
  workloadEl.hidden = !isCaching;
  if (!isCaching) resultEl.hidden = true;
}

function detailsBlock(label, value, isError) {
  const wrap = document.createElement("details");
  wrap.open = true;
  const summary = document.createElement("summary");
  summary.textContent = label;
  wrap.appendChild(summary);
  const pre = document.createElement("pre");
  if (isError) pre.className = "error";
  pre.textContent =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  wrap.appendChild(pre);
  return wrap;
}

function logStep(title, goal, server, request, response, error) {
  const section = document.createElement("section");
  section.className = error ? "step step-error" : "step";
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.appendChild(heading);
  const serverEl = document.createElement("div");
  serverEl.className = "server";
  serverEl.textContent = `${server} server · ${request.params?.name ?? request.method}`;
  section.appendChild(serverEl);
  const goalEl = document.createElement("p");
  goalEl.className = "goal";
  goalEl.textContent = goal;
  section.appendChild(goalEl);
  section.appendChild(detailsBlock("Request", request));
  section.appendChild(
    error
      ? detailsBlock("Error", error, true)
      : detailsBlock("Response", response),
  );
  log.appendChild(section);
  section.scrollIntoView({ behavior: "smooth", block: "end" });
}

async function callStep(server, title, goal, request) {
  const base = urlInput.value.trim() || undefined;
  const url = endpointUrl(server, base);
  try {
    const result = await sendRpc(url, request);
    const structured = unwrapToolResult(result);
    logStep(title, goal, server, request, structured, null);
    return structured;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logStep(title, goal, server, request, null, message);
    throw e;
  }
}

function formatPercent(x) {
  return x === null || x === undefined ? "n/a" : `${(x * 100).toFixed(1)}%`;
}

function formatDollars(x) {
  return x === null || x === undefined ? "n/a" : `$${x.toFixed(2)}`;
}

function showCacheResult(metrics) {
  const hit = document.getElementById("m-hit");
  const eff = document.getElementById("m-eff");
  const cost = document.getElementById("m-cost");
  hit.querySelector(".v").textContent = formatPercent(metrics.cache_hit_rate);
  eff.querySelector(".v").textContent = formatPercent(
    metrics.cache_cost_efficiency,
  );
  cost.querySelector(".v").textContent =
    `${formatDollars(metrics.actual_prompt_cost)} / ${formatDollars(metrics.uncached_equivalent_cost)}`;
  const efficiency = metrics.cache_cost_efficiency;
  for (const el of [eff, cost]) {
    el.classList.toggle(
      "good",
      typeof efficiency === "number" && efficiency > 0,
    );
    el.classList.toggle(
      "bad",
      typeof efficiency === "number" && efficiency <= 0,
    );
  }
  document.getElementById("m-why").textContent = metrics.interpretation ?? "";
  resultEl.hidden = false;
}

async function runRateOptimization() {
  let featuredKpis = [];
  for (const step of STEPS) {
    const request = step.buildRequest(nextId++);
    const structured = await callStep(
      step.server,
      step.title,
      step.goal,
      request,
    );
    if (step.key === "get-capability") {
      featuredKpis = structured.sections?.featured_kpis ?? [];
    }
  }
  statusEl.textContent = `Calculating ${featuredKpis.length} featured KPI(s) over the bundled FOCUS 1.0 sample...`;
  let notComputable = 0;
  for (const kpi of featuredKpis) {
    const request = calculateKpiRequest(nextId++, kpi.slug);
    try {
      await callStep(
        "focus",
        `6. Calculate ${kpi.title}`,
        `Compute ${kpi.slug} over the bundled sample (UNOFFICIAL calculation, not endorsed by the FinOps Foundation or the FOCUS project).`,
        request,
      );
    } catch {
      // calculate_kpi's own contract is to error with guidance rather than
      // fabricate a number (e.g. a zero-denominator ratio) — that is an
      // expected per-KPI outcome, not a walkthrough failure, so the
      // already-rendered error step is left in place and the walkthrough
      // continues to the next featured KPI.
      notComputable++;
    }
  }
  return notComputable > 0
    ? `Walkthrough complete — ${notComputable} of ${featuredKpis.length} featured KPI(s) were not computable over this sample (see above).`
    : "Walkthrough complete.";
}

async function runAiCaching() {
  // Read the form before any network call, so a bad value stops the run
  // with a message instead of half a walkthrough.
  const workload = workloadFromInputs();
  for (const step of AI_CACHING_STEPS) {
    const id = nextId++;
    const request =
      step.key === "tokenomics-calculate"
        ? cacheMetricsRequest(id, workload)
        : step.buildRequest(id);
    const structured = await callStep(
      step.server,
      step.title,
      step.goal,
      request,
    );
    if (step.key === "tokenomics-calculate") showCacheResult(structured);
  }
  return "Walkthrough complete — three servers, six calls, one answer.";
}

async function runWalkthrough() {
  runButton.disabled = true;
  log.textContent = "";
  resultEl.hidden = true;
  statusEl.textContent = "Running...";
  nextId = 1;
  try {
    statusEl.textContent =
      selectedWalkthrough() === "ai-caching"
        ? await runAiCaching()
        : await runRateOptimization();
  } catch (e) {
    statusEl.textContent =
      log.childElementCount > 0
        ? "Walkthrough stopped — see the error above."
        : `Walkthrough not started: ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    runButton.disabled = false;
  }
}

applyPreset(DEFAULT_CACHE_WORKLOAD);
syncPicker();

for (const radio of document.querySelectorAll('input[name="walkthrough"]')) {
  radio.addEventListener("change", syncPicker);
}

for (const button of document.querySelectorAll("[data-preset]")) {
  button.addEventListener("click", () => {
    applyPreset(PRESETS[button.dataset.preset] ?? DEFAULT_CACHE_WORKLOAD);
  });
}

runButton.addEventListener("click", () => {
  runWalkthrough().catch(() => {
    // Errors are already rendered as a step; nothing further to do here.
  });
});
