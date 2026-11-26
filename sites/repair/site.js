
import { App } from "./app.js";

export class AssistantMount {
  static GREETING = "I can tell you about brake services, labour prices and this workshop's published OpenDeal policy. I cannot sell a bicycle or take payment. Holds are simulations.";

  static DIALOGS = {
    simulate_hold: {
      title: "Simulate this hold?",
      sentence: "This is a simulation. Nothing will be reserved at a real shop and no payment will be taken.",
      confirm: "Simulate the hold",
      decline: "Do not simulate",
    },
  };

  static async start() {
    const status = document.querySelector("#assistant-status");
    const siteBase = new URL("./", import.meta.url).href;
    try {
      const { boot } = await import("./runtime/index.js");
      const booted = await boot("#agent-app", {
        originUrl: siteBase,
        sandboxWorkerUrl: new URL("runtime/sandbox-worker.js", siteBase).href,
      });
      AssistantMount.engine = booted.engine;
      AssistantMount.defaultReview = booted.engine.onActionConfirm;
      booted.engine.onActionConfirm = AssistantMount.review;
      AssistantMount.defaultConsent = booted.engine.onConsent;
      booted.engine.onConsent = AssistantMount.consent;
      const needsKey = !booted.engine.mockLLM
        && (!booted.engine.byokKey || booted.engine.byokKey === "demo");
      status.textContent = needsKey
        ? "Assistant needs your AI provider key. Add it in AI model settings below. You can still read the catalogue on this page without a key."
        : "Assistant connected to this page.";
      if (!needsKey) AssistantMount.greet();
      return booted.engine;
    } catch (error) {
      status.textContent = "The assistant could not load. You can still use the page directly.";
      console.error("Assistant startup failed", error);
      return null;
    }
  }

  static greet() {
    const first = document.querySelector("#ns-msgs .ns-msg.bot");
    if (first) first.textContent = AssistantMount.GREETING;
  }

  static dialogContent(item) {
    return AssistantMount.DIALOGS[item.action] || null;
  }

  static async review(items) {
    const pageOrigin = new URL(document.URL).origin;
    if (items.length === 1 && items[0].origin === pageOrigin && AssistantMount.DIALOGS[items[0].action]) {
      const words = AssistantMount.DIALOGS[items[0].action];
      return window.confirm(words.sentence + "\n\n" + words.title);
    }
    if (AssistantMount.defaultReview) return AssistantMount.defaultReview(items);
    return true;
  }

  static async consent(request) {
    if (AssistantMount.defaultConsent) return AssistantMount.defaultConsent(request);
    return true;
  }
}

AssistantMount.start();
window.App = App;
window.AssistantMount = AssistantMount;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function humanToken(token) {
  return escapeHtml(String(token).replace(/_/g, " "));
}

function catalogueCard(line, kind) {
  const chips = []
    .concat((line.defects || []).map((d) => `Defect: ${humanToken(d)}`))
    .concat((line.needs_repair || []).map((r) => `Needs ${humanToken(r)}`))
    .concat((line.fixes || []).map((f) => `Fixes ${humanToken(f)}`));
  const chipsHtml = chips.length
    ? `<ul class="chips">${chips.map((c) => `<li>${c}</li>`).join("")}</ul>`
    : "";
  return `<article class="shop-card">
      <header>
        <h3>${escapeHtml(line.name)}</h3>
        <span class="badge">${escapeHtml(kind)}</span>
      </header>
      <p class="price">€${escapeHtml(line.list_price)}<span class="min">Floor €${escapeHtml(line.min_price)} · id ${escapeHtml(line.id)}</span></p>
      ${chipsHtml}
      <p class="ready">Ready by ${escapeHtml(line.ready_by || "—")}</p>
    </article>`;
}

async function bootPage() {
  const policy = await App.page.load();
  const catalog = document.getElementById("catalog");
  const lines = [
    ...(policy.items || []).map((item) => [item, item.object || "item"]),
    ...(policy.services || []).map((service) => [service, "service"]),
  ];
  catalog.innerHTML = lines.map(([line, kind]) => catalogueCard(line, kind)).join("");
  const concessions = document.getElementById("concessions");
  const list = policy.concessions || [];
  concessions.innerHTML = list.length
    ? list.map((c) => {
        const delta = Number(c.price_delta) || 0;
        const deltaStr = (delta >= 0 ? "+€" : "−€") + Math.abs(delta);
        return `<li><span class="cid">${humanToken(c.id)}</span> — ${escapeHtml(c.description)} <span class="delta">(${deltaStr})</span></li>`;
      }).join("")
    : `<li class="empty">No concessions published.</li>`;
}
bootPage();
