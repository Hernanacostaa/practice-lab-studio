import { ASSUMPTIONS, AssumptionError, defaultAssumptions, estimateBusinessCase } from "./business-case.mjs";
import { initializeThemeControls } from "./theme.mjs";

initializeThemeControls();
const form = document.getElementById("business-form");
const inputPanel = document.getElementById("business-inputs");
const results = document.getElementById("model-results");
const errorPanel = document.getElementById("model-error");
const inputs = new Map();
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

for (const assumption of ASSUMPTIONS) {
  const group = document.createElement("div");
  group.className = "model-field";
  const label = document.createElement("label");
  label.htmlFor = `assumption-${assumption.key}`;
  label.textContent = assumption.label;
  const unit = document.createElement("span");
  unit.className = "model-unit";
  unit.textContent = assumption.unit;
  const input = document.createElement("input");
  input.id = label.htmlFor;
  input.type = "number";
  input.min = String(assumption.min);
  input.max = String(assumption.max);
  input.step = String(assumption.step);
  input.value = String(assumption.default);
  input.required = true;
  const note = document.createElement("p");
  note.id = `note-${assumption.key}`;
  note.textContent = assumption.note;
  input.setAttribute("aria-describedby", note.id);
  group.append(label, unit, input, note);
  inputPanel.append(group);
  inputs.set(assumption.key, input);
}

function renderModel() {
  for (const input of inputs.values()) input.removeAttribute("aria-invalid");
  try {
    const values = Object.fromEntries(Array.from(inputs, ([key, input]) => [key, input.value.trim() ? Number(input.value) : NaN]));
    const model = estimateBusinessCase(values);
    document.getElementById("result-hours").textContent = `${decimal.format(model.monthlyHours)} hours`;
    document.getElementById("result-gross").textContent = currency.format(model.grossCapacityValue);
    document.getElementById("result-cost").textContent = currency.format(model.runningCost);
    document.getElementById("result-net").textContent = currency.format(model.netCapacityValue);
    document.getElementById("result-net").classList.toggle("negative-value", model.netCapacityValue < 0);
    document.getElementById("result-reduction").textContent = `${decimal.format(model.reductionPercent)}%`;
    document.getElementById("result-break-even").textContent = model.breakEvenAttempts === null
      ? "Not reached: no positive per-attempt contribution"
      : `${model.breakEvenAttempts.toLocaleString("en-US")} attempts / month`;
    document.getElementById("result-payback").textContent = model.paybackMonths === null
      ? "Not reached under these assumptions"
      : `${decimal.format(model.paybackMonths)} months (capacity-equivalent)`;
    document.getElementById("model-interpretation").textContent = model.perAttemptContribution <= 0
      ? "This scenario has no positive per-attempt contribution. More volume alone cannot produce a positive net capacity value."
      : model.netCapacityValue <= 0
        ? "This scenario does not cover the modeled fixed cost at the selected volume. It is not a positive business case yet."
        : "This scenario has positive modeled capacity value. That is a hypothesis to validate, not evidence of realized savings.";
    errorPanel.hidden = true;
    errorPanel.textContent = "";
    results.hidden = false;
  } catch (error) {
    if (!(error instanceof AssumptionError)) throw error;
    if (inputs.has(error.field)) inputs.get(error.field).setAttribute("aria-invalid", "true");
    errorPanel.textContent = error.message;
    errorPanel.hidden = false;
    results.hidden = true;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderModel();
});
form.addEventListener("input", renderModel);
document.getElementById("model-reset").addEventListener("click", () => {
  for (const [key, value] of Object.entries(defaultAssumptions())) inputs.get(key).value = String(value);
  renderModel();
});
renderModel();
document.getElementById("calculator-unavailable").hidden = true;
document.getElementById("interactive-model").hidden = false;
