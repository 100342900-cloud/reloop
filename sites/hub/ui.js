import { App } from "./app.js";

const euro = (n) => `€${n}`;

function el(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function setError(message) {
  const err = el("error-banner");
  if (message) {
    err.hidden = false;
    err.textContent = message;
  } else {
    err.hidden = true;
    err.textContent = "";
  }
}

function setStep(current) {
  const order = ["need", "consent", "package", "confirm", "receipt"];
  const visible = {
    need: Boolean(App.page.need),
    consent: Boolean(App.page.need),
    package: Boolean(App.page.result),
    confirm: Boolean(App.page.result && App.page.result.status === "composed"),
    receipt: Boolean(App.page.receipt && App.page.result),
  };
  el("stepper").hidden = !App.page.need;
  for (const name of order) {
    const node = el(`step-ind-${name}`);
    if (!node) continue;
    node.classList.toggle("is-on", name === current);
    node.classList.toggle("is-done", visible[name] && order.indexOf(name) < order.indexOf(current));
  }
}

function renderNeed() {
  const need = App.page.need;
  const panel = el("need-card");
  const started = Boolean(need);
  const hero = document.querySelector(".hero");
  const how = document.querySelector(".how");
  if (hero) hero.hidden = started;
  if (how) how.hidden = started;
  if (!need) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  el("need-summary").textContent =
    `${need.label}. Demo date ${App.DEMO_CLOCK} (Wednesday); Saturday is ${App.DEMO_SATURDAY}. Budget ${euro(need.budget)}.`;
}

function renderConsent() {
  const box = el("consent-list");
  box.innerHTML = "";
  el("step-consent").hidden = !App.page.need;
  el("opt-collect").checked = App.page.collect;
  el("opt-deliver").checked = !App.page.collect;
  for (const peer of App.page.allPeers()) {
    const granted = Boolean(App.page.consent[peer.origin]);
    const card = document.createElement("article");
    card.className = "consent-card" + (granted ? " is-on" : " is-off");
    card.innerHTML = `
      <header>
        <h3>${escapeHtml(peer.name)}</h3>
        <span class="role">${escapeHtml(peer.role)}${peer.added ? " · added" : ""}</span>
      </header>
      <p class="origin">${escapeHtml(peer.origin)}</p>
      <p>${escapeHtml(peer.purpose)}</p>
      <div class="consent-actions">
        <button type="button" data-allow="1" aria-pressed="${granted}">Allow</button>
        <button type="button" data-allow="0" aria-pressed="${!granted}">Deny</button>
      </div>`;
    card.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        App.page.setConsent(peer.origin, button.dataset.allow === "1");
        renderConsent();
        renderResult();
        renderHolds();
        renderReceipt();
      });
    });
    box.appendChild(card);
  }
}

function shopCard(line) {
  const chips = (line.concessions || [])
    .map((c) => `<li>${escapeHtml(c.replaceAll("_", " "))}</li>`)
    .join("");
  const dropped = line.price !== line.list_price
    ? `<s>${euro(line.list_price)}</s>`
    : "";
  return `<article class="shop-card">
    <header>
      <h3>${escapeHtml(line.site)}</h3>
      <span class="role">${escapeHtml(line.role)}</span>
    </header>
    <p>${escapeHtml(line.name)}</p>
    <p class="price">${dropped}${euro(line.price)}</p>
    <p class="hint">Ready by ${escapeHtml(line.ready_by || "—")}</p>
    <ul class="chips">${chips}</ul>
  </article>`;
}

function renderResult() {
  const result = App.page.result;
  const panel = el("result-panel");
  setError(App.page.error);
  if (!result) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const initial = result.initialPackage;
  const final = result.finalPackage;
  el("initial-total").textContent = initial ? euro(initial.total) : "—";
  el("initial-flag").textContent = initial?.meets_budget ? "Within budget" : "Over budget";
  el("initial-flag").className = "flag" + (initial?.meets_budget ? " ok" : " bad");
  el("final-total").textContent = final ? euro(final.total) : "—";
  el("final-flag").textContent = result.status === "composed"
    ? "Composed — a flat shop site cannot sell this outcome alone"
    : "Infeasible";
  el("final-flag").className = "flag" + (result.status === "composed" ? " ok" : " bad");
  el("package-table").innerHTML = (final?.lines || []).map(shopCard).join("");
  el("rounds").innerHTML = result.rounds.map((round) => {
    const applied = round.concessions_applied?.length
      ? round.concessions_applied.join(", ")
      : "none";
    return `<li class="is-new"><strong>Round ${round.round}</strong> — ${euro(round.package.total)} (${escapeHtml(applied)}). ${escapeHtml(round.note)}</li>`;
  }).join("");
  const inspector = {
    status: result.status,
    reason: result.reason || null,
    initial,
    final,
    receipt: App.page.receipt,
  };
  el("inspector").textContent = JSON.stringify(inspector, null, 2);
}

function renderHolds() {
  const panel = el("confirm-panel");
  const composed = App.page.result?.status === "composed";
  panel.hidden = !composed;
  if (!composed) return;
  const box = el("hold-cards");
  const drafts = {};
  box.querySelectorAll(".hold-card").forEach((card) => {
    const origin = card.dataset.origin;
    drafts[origin] = {};
    card.querySelectorAll("[data-field]").forEach((input) => {
      drafts[origin][input.dataset.field] = input.value;
    });
  });
  box.innerHTML = "";
  for (const target of App.page.holdTargets()) {
    const existing = App.page.holds.find((h) => h.origin === target.origin);
    const card = document.createElement("article");
    card.className = "hold-card" + (existing ? " is-done" : "");
    card.dataset.origin = target.origin;
    const extra = target.may_receive_address
      ? `<p>At quote time this shop did not receive an address. You may share an area token, and only now a street address, for this simulated hold.</p>
         <label>Area token (optional)<input type="text" data-field="area_token" maxlength="40" ${existing ? "disabled" : ""}></label>
         <label>Street address (optional, cargo confirm only)<input type="text" data-field="street_address" maxlength="80" ${existing ? "disabled" : ""}></label>`
      : `<p>This shop will only see the item or service id, the ready-by date and the price. It will not see an address.</p>`;
    card.innerHTML = `
      <h3>${escapeHtml(target.site)}</h3>
      <p>${escapeHtml(target.name)} · ${euro(target.price)}</p>
      ${extra}
      <p class="hint">${existing ? `Recorded ${existing.id}` : "Simulation only. Nothing is reserved."}</p>
      <button type="button" data-hold="${escapeHtml(target.origin)}" ${existing ? "disabled" : ""}>${existing ? "Hold simulated" : "Simulate hold"}</button>`;
    const draft = drafts[target.origin] || {};
    card.querySelectorAll("[data-field]").forEach((input) => {
      if (draft[input.dataset.field] && !input.disabled) {
        input.value = draft[input.dataset.field];
      }
    });
    const button = card.querySelector("[data-hold]");
    button.addEventListener("click", () => {
      const extraFields = {};
      card.querySelectorAll("[data-field]").forEach((input) => {
        extraFields[input.dataset.field] = input.value;
      });
      App.page.simulateHold(target.origin, extraFields);
      renderHolds();
      renderReceipt();
      setStep(App.page.allHoldsDone() ? "receipt" : "confirm");
    });
    box.appendChild(card);
  }
}

function shortHash(hash) {
  return hash ? `${hash.slice(0, 12)}…${hash.slice(-8)}` : "—";
}

function renderReceipt() {
  const panel = el("receipt-panel");
  const receipt = App.page.receipt;
  if (!receipt || !App.page.result || !App.page.holds.length) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  el("receipt-watermark").textContent = receipt.watermark;
  const policies = (receipt.policies || []).map((p) =>
    `<div><strong>${escapeHtml(p.site)}</strong><div class="hash" title="${escapeHtml(p.sha256)}">${escapeHtml(shortHash(p.sha256))}</div></div>`).join("");
  const holds = (receipt.holds || []).map((h) =>
    `<li>${escapeHtml(h.id)} · ${escapeHtml(h.site)} · disclosed: ${escapeHtml((h.disclosed_fields || []).join(", "))}</li>`).join("")
    || "<li>No holds simulated yet.</li>";
  const allowed = (receipt.consent || []).filter((c) => c.granted).map((c) => c.site).join(", ") || "none";
  el("receipt-body").innerHTML = `
    <dl>
      <dt>Status</dt><dd>${escapeHtml(receipt.status)}${receipt.total != null ? " · " + euro(receipt.total) : ""}</dd>
      <dt>Need</dt><dd>${escapeHtml(receipt.need?.label || "")}</dd>
      <dt>Allowed origins</dt><dd>${escapeHtml(allowed)}</dd>
      <dt>Policy hashes</dt><dd>${policies}</dd>
      <dt>Holds</dt><dd><ul>${holds}</ul></dd>
    </dl>`;
}

async function composeAndPaint() {
  const outcome = await App.page.composeFromConsent();
  renderConsent();
  renderResult();
  renderHolds();
  renderReceipt();
  setStep(App.page.result ? "package" : "consent");
  if (App.page.result) {
    el("result-panel").scrollIntoView({ behavior: prefersMotion() ? "smooth" : "auto", block: "start" });
  }
  return outcome;
}

function prefersMotion() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

async function runSaturday() {
  App.page.addedPeers = [];
  App.page.collect = false;
  App.page.consent = {};
  App.page.setSaturdayNeed();
  for (const peer of App.defaultPeers) {
    App.page.setConsent(peer.origin, true);
  }
  renderNeed();
  renderConsent();
  return composeAndPaint();
}

async function runComposeOnly() {
  return composeAndPaint();
}

async function addShop() {
  const status = el("add-shop-status");
  status.textContent = "";
  try {
    const raw = el("shop-url").value;
    const result = await App.page.addShopByUrl(raw);
    status.textContent = result.already
      ? `${result.peer.name} was already listed and is now allowed.`
      : `Added ${result.peer.name} from ${result.peer.origin}. Compose again to include it.`;
    el("shop-url").value = "";
    renderConsent();
  } catch (error) {
    status.textContent = error.message || String(error);
  }
}

function downloadReceipt() {
  if (!App.page.receipt) return;
  const blob = new Blob([JSON.stringify(App.page.receipt, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "reloop-receipt.json";
  link.click();
  URL.revokeObjectURL(url);
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
  el("btn-add-shop").addEventListener("click", (event) => {
    event.preventDefault();
    addShop();
  });
  el("shop-url").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addShop();
    }
  });
  el("opt-collect").addEventListener("change", () => {
    if (el("opt-collect").checked) {
      App.page.setCollect(true);
      if (App.page.need) runComposeOnly();
      else {
        renderConsent();
        renderResult();
        renderHolds();
        renderReceipt();
      }
    }
  });
  el("opt-deliver").addEventListener("change", () => {
    if (el("opt-deliver").checked) {
      App.page.setCollect(false);
      if (App.page.need) runComposeOnly();
      else {
        renderConsent();
        renderResult();
        renderHolds();
        renderReceipt();
      }
    }
  });
  el("btn-download-receipt").addEventListener("click", downloadReceipt);
  renderConsent();
}

bind();

window.ReloopUI = {
  runSaturday,
  runComposeOnly,
  addShop,
  renderResult,
  renderConsent,
  renderHolds,
  renderReceipt,
};
