import test from "node:test";
import assert from "node:assert/strict";
import { ASSUMPTIONS, AssumptionError, defaultAssumptions, estimateBusinessCase } from "../src/business-case.mjs";

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test("fictional defaults include review, unsuccessful attempts, usage cost and fixed cost", () => {
  const result = estimateBusinessCase(defaultAssumptions());
  close(result.workflowMinutes, 24.5);
  close(result.monthlyHours, 80 * 20.5 / 60);
  close(result.grossCapacityValue, 80 * 20.5 / 60 * 50);
  close(result.runningCost, 280);
  close(result.netCapacityValue, 1086.6666666666667);
  close(result.reductionPercent, 20.5 / 45 * 100);
  assert.equal(result.breakEvenAttempts, 13);
  close(result.paybackMonths, 1200 / result.netCapacityValue);
});

test("a failed assisted attempt adds its spent time before a full manual fallback", () => {
  const result = estimateBusinessCase({ ...defaultAssumptions(), successPercent: 0 });
  close(result.workflowMinutes, 65);
  close(result.monthlyHours, -80 * 20 / 60);
  assert.equal(result.runningCost, 280);
  assert.ok(result.netCapacityValue < 0);
  assert.equal(result.breakEvenAttempts, null);
  assert.equal(result.paybackMonths, null);
});

test("successful attempts still include assisted labor and all usage costs", () => {
  const result = estimateBusinessCase({ ...defaultAssumptions(), successPercent: 100 });
  close(result.workflowMinutes, 20);
  close(result.monthlyHours, 80 * 25 / 60);
  assert.equal(result.runningCost, 280);
});

test("zero volume retains fixed cost and does not invent payback", () => {
  const result = estimateBusinessCase({ ...defaultAssumptions(), attempts: 0 });
  assert.equal(result.monthlyHours, 0);
  assert.equal(result.grossCapacityValue, 0);
  assert.equal(result.runningCost, 200);
  assert.equal(result.netCapacityValue, -200);
  assert.equal(result.paybackMonths, null);
});

test("zero unit contribution is explicit; no infinity or fabricated break-even", () => {
  const result = estimateBusinessCase({ ...defaultAssumptions(), successPercent: 100, assistedMinutes: 45, variableCost: 0 });
  assert.equal(result.perAttemptContribution, 0);
  assert.equal(result.breakEvenAttempts, null);
  assert.equal(result.paybackMonths, null);
});

test("higher assisted effort produces a negative time reduction, not a clamped saving", () => {
  const result = estimateBusinessCase({ ...defaultAssumptions(), assistedMinutes: 90 });
  assert.ok(result.monthlyHours < 0);
  assert.ok(result.reductionPercent < 0);
  assert.ok(result.grossCapacityValue < 0);
});

test("setup cost affects payback, not the monthly operating model", () => {
  const base = estimateBusinessCase(defaultAssumptions());
  const freeSetup = estimateBusinessCase({ ...defaultAssumptions(), setupCost: 0 });
  assert.equal(freeSetup.netCapacityValue, base.netCapacityValue);
  assert.equal(freeSetup.paybackMonths, 0);
  const doubleSetup = estimateBusinessCase({ ...defaultAssumptions(), setupCost: 2400 });
  close(doubleSetup.paybackMonths, base.paybackMonths * 2);
});

test("break-even rounds up to whole attempts and zero fixed cost permits zero fixed-cost break-even", () => {
  const input = defaultAssumptions();
  const result = estimateBusinessCase(input);
  assert.ok(estimateBusinessCase({ ...input, attempts: result.breakEvenAttempts }).netCapacityValue >= 0);
  assert.ok(estimateBusinessCase({ ...input, attempts: result.breakEvenAttempts - 1 }).netCapacityValue < 0);
  assert.equal(estimateBusinessCase({ ...input, fixedCost: 0 }).breakEvenAttempts, 0);
});

test("invalid, missing, out-of-range and nonfinite values are rejected without coercion", () => {
  for (const invalid of [null, [], "80"]) assert.throws(() => estimateBusinessCase(invalid), AssumptionError);
  for (const assumption of ASSUMPTIONS) {
    for (const value of [undefined, null, "", "10", NaN, Infinity, -Infinity, assumption.min - 1, assumption.max + 1]) {
      assert.throws(
        () => estimateBusinessCase({ ...defaultAssumptions(), [assumption.key]: value }),
        (error) => error instanceof AssumptionError && error.field === assumption.key,
      );
    }
  }
  assert.throws(() => estimateBusinessCase({ ...defaultAssumptions(), attempts: 2.5 }), AssumptionError);
});

test("numeric bounds are finite and defaults are fresh immutable-config copies", () => {
  const first = defaultAssumptions();
  const second = defaultAssumptions();
  first.attempts = 100;
  assert.equal(second.attempts, 80);
  assert.ok(Object.isFrozen(ASSUMPTIONS));
  assert.ok(ASSUMPTIONS.every(Object.isFrozen));
  const maximum = Object.fromEntries(ASSUMPTIONS.map(({ key, max }) => [key, max]));
  assert.ok(Object.values(estimateBusinessCase(maximum)).every((value) => value === null || Number.isFinite(value)));
});

test("unrepresentable ratios fail explicitly instead of displaying infinite payback or break-even", () => {
  const input = {
    ...defaultAssumptions(),
    attempts: 1,
    manualMinutes: 60,
    assistedMinutes: 0,
    successPercent: 100,
    hourlyRate: Number.MIN_VALUE,
    variableCost: 0,
    fixedCost: 0,
    setupCost: 1,
  };
  for (const values of [input, { ...input, fixedCost: 1, setupCost: 0 }]) {
    assert.throws(() => estimateBusinessCase(values), (error) =>
      error instanceof AssumptionError && /numeric range/.test(error.message));
  }
});
