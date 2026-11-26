import { App } from "./app.js";

export class AssistantMount {
  static GREETING = "I can read the shops you have consented to and talk through the package this page already composed. Prices come from the OpenDeal engine on this page, not from me inventing a discount. I cannot take payment.";

  static DIALOGS = {};

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
        ? "Assistant needs your AI provider key. Add it in AI model settings below. The Saturday bicycle demo on this page does not need a key."
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

  static async review(items) {
    if (AssistantMount.defaultReview) return AssistantMount.defaultReview(items);
    return true;
  }

  static async consent(request) {
    if (AssistantMount.defaultConsent) return AssistantMount.defaultConsent(request);
    return true;
  }
}

AssistantMount.start();
// Expose for the product UI and tests.
window.App = App;
window.AssistantMount = AssistantMount;
