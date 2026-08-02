import { CONFIG, endpointUrl } from "./config.js";
import { STEPS, calculateKpiRequest } from "./requests.js";
import { sendRpc, unwrapToolResult } from "./client.js";

const runButton = document.getElementById("run");
const urlInput = document.getElementById("worker-url");
const log = document.getElementById("log");
const statusEl = document.getElementById("status");

urlInput.value = CONFIG.workerBaseUrl;

let nextId = 1;

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
  heading.textContent = `${title} — ${server} server`;
  section.appendChild(heading);
  const goalEl = document.createElement("p");
  goalEl.className = "goal";
  goalEl.textContent = goal;
  section.appendChild(goalEl);
  section.appendChild(detailsBlock("Request", request));
  section.appendChild(
    error ? detailsBlock("Error", error, true) : detailsBlock("Response", response),
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

async function runWalkthrough() {
  runButton.disabled = true;
  log.textContent = "";
  statusEl.textContent = "Running...";
  nextId = 1;
  try {
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
    statusEl.textContent =
      notComputable > 0
        ? `Walkthrough complete — ${notComputable} of ${featuredKpis.length} featured KPI(s) were not computable over this sample (see above).`
        : "Walkthrough complete.";
  } catch {
    statusEl.textContent = "Walkthrough stopped — see the error above.";
  } finally {
    runButton.disabled = false;
  }
}

runButton.addEventListener("click", () => {
  runWalkthrough().catch(() => {
    // Errors are already rendered as a step; nothing further to do here.
  });
});
