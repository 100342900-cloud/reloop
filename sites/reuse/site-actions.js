
import { App } from "./app.js";

class SiteActions {
  static registerActions(actions) {
    actions.register(SiteActions.readStateAction());
    actions.register(SiteActions.simulateHoldAction());
  }

  static readStateAction() {
    return {
      name: "get_site_state",
      description: "Read this shop's public catalogue or services, its OpenDeal policy, any simulated holds, and the current version. Call it before answering about prices or stock, and again in each turn that needs it: the visitor can also use the page.",
      effect: "read",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => App.page.getState(),
    };
  }

  static simulateHoldAction() {
    return {
      name: "simulate_hold",
      description: "Simulate a hold on a catalogue item or service id from website_get_site_state. This is not a real booking and takes no payment. The browser asks the visitor to confirm.",
      effect: "irreversible",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["targetId"],
        properties: {
          targetId: { type: "string", minLength: 1, maxLength: 80, description: "Item or service id from website_get_site_state." },
        },
      },
      execute: (args) => App.page.simulateHold(args),
    };
  }
}

export const registerActions = SiteActions.registerActions;
