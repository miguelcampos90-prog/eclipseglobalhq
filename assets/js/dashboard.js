// ===============================
// BASE URL FOR LUCIFEX BACKEND
// ===============================
const BASE_URL = "https://eclipse-command-backend-37886694782.us-central1.run.app";

// Utility: Template literal safe HTML
function html(strings, ...values) {
  return strings.reduce((acc, str, i) => acc + str + (values[i] || ""), "");
}

// =============================================
// 1. LIVE OPS FEED
// =============================================
async function loadOpsFeed() {
  const container = document.getElementById("opsFeed");
  container.innerHTML = "<p>Loading...</p>";

  try {
    const res = await fetch(`${BASE_URL}/ops/recent`);
    const data = await res.json();

    if (!data.events || data.events.length === 0) {
      container.innerHTML = "<p>No operations logged yet.</p>";
      return;
    }

    container.innerHTML = data.events
      .map(
        (e) => html`
        <div class="eg-op-item">
          <strong>[${e.timestamp}]</strong><br/>
          ${e.source} → ${e.action} → ${e.entity}<br/>
          <small>${e.details}</small><br/>
          <em>${e.metadata}</em>
        </div>
        <hr/>
      `
      )
      .join("");
  } catch (err) {
    container.innerHTML = "<p>Error loading operations.</p>";
  }
}

// =============================================
// 2. SYSTEM SUMMARY
// =============================================
async function loadOpsSummary() {
  const container = document.getElementById("opsSummary");
  container.innerHTML = "<p>Loading summary...</p>";

  try {
    const res = await fetch(`${BASE_URL}/ops/summary`);
    const data = await res.json();
    const summary = data.summary;

    container.innerHTML = html`
      <div class="eg-summary-item"><strong>Total Ops:</strong> ${summary.total}</div>
      <div class="eg-summary-item">
        <strong>By Source:</strong>
        <pre>${JSON.stringify(summary.bySource, null, 2)}</pre>
      </div>
      <div class="eg-summary-item">
        <strong>By Action:</strong>
        <pre>${JSON.stringify(summary.byAction, null, 2)}</pre>
      </div>
    `;
  } catch (err) {
    container.innerHTML = "<p>Error loading summary.</p>";
  }
}

// =============================================
// 3. RECENT LEAD INTAKE
// =============================================
async function loadLeadWindow() {
  const container = document.getElementById("leadWindow");
  container.innerHTML = "<p>Loading leads...</p>";

  try {
    const res = await fetch(`${BASE_URL}/hq/leads`);
    const data = await res.json();

    if (!data.leads || data.leads.length === 0) {
      container.innerHTML = "<p>No recent leads found.</p>";
      return;
    }

    container.innerHTML = data.leads
      .map(
        (l) => html`
        <div class="eg-lead-item">
          <strong>${l.fullName}</strong> → ${l.selectedNode}<br/>
          <small>${l.email}</small><br/>
          <em>${l.needs}</em><br/>
          <span>${l.timestamp}</span>
        </div>
        <hr/>
      `
      )
      .join("");
  } catch (err) {
    container.innerHTML = "<p>Error loading leads.</p>";
  }
}

// =============================================
// 4. GOVERNANCE SIGNALS
// =============================================
async function loadGovernancePanel() {
  const container = document.getElementById("govSignals");
  container.innerHTML = "<p>Loading governance signals...</p>";

  try {
    const res = await fetch(`${BASE_URL}/gov/signals`);
    const data = await res.json();
    const sig = data.signals;

    container.innerHTML = html`
      <div class="eg-signal-block">
        <h4>Last Mandate</h4>
        ${sig.mandate ? html`
          <strong>${sig.mandate.mandateId}</strong><br/>
          Scope: ${sig.mandate.scope}<br/>
          Status: ${sig.mandate.status}<br/>
          <em>${sig.mandate.notes}</em>
        ` : "None"}
      </div>
      <hr/>

      <div class="eg-signal-block">
        <h4>Last Decision</h4>
        ${sig.decision ? html`
          <strong>${sig.decision.decision}</strong><br/>
          Owner: ${sig.decision.owner}<br/>
          Status: ${sig.decision.status}<br/>
          <em>${sig.decision.notes}</em>
        ` : "None"}
      </div>
      <hr/>

      <div class="eg-signal-block">
        <h4>Last Audit</h4>
        ${sig.audit ? html`
          <strong>${sig.audit.node}</strong><br/>
          Section: ${sig.audit.section}<br/>
          Status: ${sig.audit.status}<br/>
          <em>${sig.audit.notes}</em>
        ` : "None"}
      </div>
    `;
  } catch (err) {
    container.innerHTML = "<p>Error loading governance data.</p>";
  }
}

// =============================================
// INIT DASHBOARD
// =============================================
window.addEventListener("DOMContentLoaded", () => {
  loadOpsFeed();
  loadOpsSummary();
  loadLeadWindow();
  loadGovernancePanel();
});
