export const ASSUMPTIONS = Object.freeze([
  { key: "attempts", label: "Assisted attempts per month", unit: "worksheets", default: 80, min: 0, max: 100000, step: 1, integer: true, note: "Attempts using the workflow, including unsuccessful ones." },
  { key: "manualMinutes", label: "Manual time per worksheet", unit: "minutes", default: 45, min: 1, max: 480, step: 1, note: "Baseline authoring, review, and corrections to an accepted worksheet." },
  { key: "assistedMinutes", label: "Time spent per assisted attempt", unit: "minutes", default: 20, min: 0, max: 480, step: 1, note: "Includes review and normal corrections; also spent on failed attempts." },
  { key: "successPercent", label: "Assisted completion rate", unit: "%", default: 90, min: 0, max: 100, step: 1, note: "Share producing a reviewed usable worksheet without a full manual restart." },
  { key: "hourlyRate", label: "Loaded labor value", unit: "USD / hour", default: 50, min: 0, max: 1000, step: 1, note: "An assumed value for reusable time, not a promised cash saving." },
  { key: "variableCost", label: "Usage cost per attempt", unit: "USD", default: 1, min: 0, max: 1000, step: 0.01, note: "Charged on every attempt. This is not an actual platform price." },
  { key: "fixedCost", label: "Fixed monthly running cost", unit: "USD", default: 200, min: 0, max: 1000000, step: 1, note: "Assumed licensing and recurring support; avoid double-counting review." },
  { key: "setupCost", label: "One-time setup and enablement", unit: "USD", default: 1200, min: 0, max: 10000000, step: 1, note: "An illustrative upfront cost, separate from monthly operations." },
].map(Object.freeze));

export function defaultAssumptions() {
  return Object.fromEntries(ASSUMPTIONS.map(({ key, default: value }) => [key, value]));
}

export class AssumptionError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "AssumptionError";
    this.field = field;
  }
}

export function estimateBusinessCase(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AssumptionError(null, "Provide the eight numeric planning assumptions.");
  }
  for (const { key, label, min, max, integer } of ASSUMPTIONS) {
    const value = input[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      throw new AssumptionError(key, `${label} must be ${integer ? "a whole number" : "a number"} between ${min.toLocaleString("en-US")} and ${max.toLocaleString("en-US")}.`);
    }
  }
  const { attempts, manualMinutes, assistedMinutes, successPercent, hourlyRate, variableCost, fixedCost, setupCost } = input;
  const workflowMinutes = assistedMinutes + (1 - successPercent / 100) * manualMinutes;
  const savedMinutes = manualMinutes - workflowMinutes;
  const monthlyHours = attempts * savedMinutes / 60;
  const grossCapacityValue = monthlyHours * hourlyRate;
  const runningCost = attempts * variableCost + fixedCost;
  const netCapacityValue = grossCapacityValue - runningCost;
  const perAttemptContribution = savedMinutes * hourlyRate / 60 - variableCost;
  const result = {
    workflowMinutes,
    monthlyHours,
    grossCapacityValue,
    runningCost,
    netCapacityValue,
    reductionPercent: savedMinutes / manualMinutes * 100,
    perAttemptContribution,
    breakEvenAttempts: perAttemptContribution > 0 ? Math.ceil(fixedCost / perAttemptContribution) : null,
    paybackMonths: netCapacityValue > 0 ? setupCost / netCapacityValue : null,
  };
  if (Object.values(result).some((value) => value !== null && !Number.isFinite(value))) {
    throw new AssumptionError(null, "These assumptions exceed the calculator's numeric range. Use less extreme time or cost values.");
  }
  return result;
}
