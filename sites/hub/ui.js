import { App } from "./app.js";

const euro = (n) => `€${n}`;

function el(id) {
  return document.getElementById(id);
}

function renderConsent() {
  const box = el("consent-list");
  box.innerHTML = "";
  for (const peer of App.peers) {
    const granted = Boolean(App.page.consent[peer.origin]);
    const card = document.createElement("label");
    card.className = "consent-card" + (granted ? " is-on" : "");
    card.innerHTML = `
      <input type="checkbox" data-origin="${peer.origin}" ${granted ? "checked" : ""}>
      <span>
        <strong>${peer.name}</strong>
        <em>${peer.origin}</em>
        <span>${peer.purpose}</span>
      </span>`;
    card.querySelector("input").addEventListener("change", (event) => {
      App.page.setConsent(peer.origin, event.target.checked);
      renderConsent();
    });
    box.appendChild(card);
  }
}

function renderNeed() {
  const need = App.page.need;
  const panel = el("need-card");
  if (!need) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  el("need-summary").textContent =
    `${need.label}. Demo date ${App.DEMO_CLOCK} (Wednesday); Saturday is ${App.DEMO_SATURDAY}. Budget ${euro(need.budget)}.`;
}

function lineRow(line) {
  const concession = line.concessions?.length
    ? ` · concessions: ${line.concessions.join(", ")}`
    : "";
  return `<tr>
    <td>${line.site}</td>
    <td>${line.name}</td>
    <td>${euro(line.list_price)}</td>
    <td>${euro(line.price)}</td>
    <td>${line.ready_by || "—"}${concession}</td>
  </tr>`;
}

function renderResult() {
  const result = App.page.result;
  const panel = el("result-panel");
  const err = el("error-banner");
  if (App.page.error) {
    err.hidden = false;
    err.textContent = App.page.error;
  } else {
    err.hidden = true;
    err.textContent = "";
  }
  if (!result) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const initial = result.initialPackage;
  const final = result.finalPackage;
  el("initial-total").textContent = initial ? euro(initial.total) : "—";
  el("initial-flag").textContent = initial?.meets_budget
    ? "Within budget"
    : "Over budget";
  el("initial-flag").className = "flag" + (initial?.meets_budget ? " ok" : " bad");
  el("final-total").textContent = final ? euro(final.total) : "—";
  el("final-flag").textContent = result.status === "composed"
    ? "Composed — a flat shop site cannot sell this outcome alone"
    : "Infeasible";
  el("final-flag").className = "flag" + (result.status === "composed" ? " ok" : " bad");
  el("package-table").innerHTML = (final?.lines || []).map(lineRow).join("");
  el("rounds").innerHTML = result.rounds.map((round) => {
    const applied = round.concessions_applied?.length
      ? round.concessions_applied.join(", ")
      : "none";
    return `<li><strong>Round ${round.round}</strong> — ${euro(round.package.total)} (${applied}). ${round.note}</li>`;
  }).join("");
  const inspector = {
    status: result.status,
    reason: result.reason || null,
    initial: initial,
    final: final,
    receipt: App.page.receipt,
  };
  el("inspector").textContent = JSON.stringify(inspector, null, 2);
}

async function runSaturday() {
  App.page.setSaturdayNeed();
  // Default happy path: consent to the three published shops.
  for (const peer of App.peers) {
    App.page.setConsent(peer.origin, true);
  }
  renderNeed();
  renderConsent();
  el("step-consent").hidden = false;
  const outcome = await App.page.composeFromConsent();
  renderResult();
  el("result-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  return outcome;
}

async function runComposeOnly() {
  const outcome = await App.page.composeFromConsent();
  renderResult();
  return outcome;
}

function bind() {
  el("btn-saturday").addEventListener("click", (event) => {
    event.preventDefault();
    runSaturday();
  });
  el("btn-compose").addEventListener("click", (event) => {
    event.preventDefault();
    runComposeOnly();
  });
  renderConsent();
}

bind();

// For Playwright and debugging.
window.ReloopUI = { runSaturday, runComposeOnly, renderResult, renderConsent };
