
import { App } from "./app.js";

export class AssistantMount {
  static GREETING = "I can tell you about the refurbished bikes on this page and this shop's published OpenDeal policy. I cannot repair a bike or take payment. Holds are simulations.";

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

async function bootPage() {
  const policy = await App.page.load();
  const catalog = document.getElementById("catalog");
  const lines = [...(policy.items || []), ...(policy.services || [])];
  catalog.innerHTML = lines.map((line) => {
    const price = "€" + line.list_price + " (minimum €" + line.min_price + ")";
    const extra = line.defects?.length ? "Defects: " + line.defects.join(", ") : (line.fixes ? "Fixes: " + line.fixes.join(", ") : "");
    return `<article class="card"><h3>${line.name}</h3><p>Id: ${line.id} · ${price}</p><p>${extra}</p><p>Ready by ${line.ready_by || "—"}.</p></article>`;
  }).join("");
  const concessions = document.getElementById("concessions");
  concessions.innerHTML = (policy.concessions || []).map((c) => `<li><strong>${c.id}</strong> — ${c.description} (${c.price_delta} €)</li>`).join("");
}
bootPage();
