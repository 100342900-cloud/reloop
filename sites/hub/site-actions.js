import { App } from "./app.js";

class SiteActions {
  static registerActions(actions) {
    actions.register(SiteActions.readStateAction());
  }

  static readStateAction() {
    return {
      name: "get_site_state",
      description: "Read the current need, which shop origins the visitor has consented to, the latest OpenDeal composition, its version and any receipt on this page. Call it before answering about the need or package, and again in each turn that needs it: the visitor can also use the page.",
      effect: "read",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: SiteActions.readState,
    };
  }

  static readState() {
    return App.page.getState();
  }
}

export const registerActions = SiteActions.registerActions;
