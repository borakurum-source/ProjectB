import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

async function loadMeasurementState() {
  const vite = await createServer({
    appType: "custom",
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } },
  });
  return { vite, measurementState: await vite.ssrLoadModule("/features/projectb/services/measurementState.ts") };
}

test("classifies an absent cycle as not measured instead of a zero result", async () => {
  const { vite, measurementState } = await loadMeasurementState();
  try {
    const state = measurementState.classifyMeasurement({ totalRuns: 0, value: 0 });
    assert.equal(state.kind, "not_measured");
    assert.equal(state.display, "Not measured");
    assert.equal(state.sampleSize, 0);
  } finally {
    await vite.close();
  }
});

test("classifies a measured zero with its observed denominator", async () => {
  const { vite, measurementState } = await loadMeasurementState();
  try {
    const state = measurementState.classifyMeasurement({ totalRuns: 3, value: 0, measuredAt: "2026-08-28T00:00:00.000Z" });
    assert.equal(state.kind, "measured_zero");
    assert.equal(state.display, "0% (0/3)");
    assert.equal(state.sampleSize, 3);
  } finally {
    await vite.close();
  }
});

test("classifies an old completed measurement as stale without changing its value", async () => {
  const { vite, measurementState } = await loadMeasurementState();
  try {
    const state = measurementState.classifyMeasurement({
      totalRuns: 9,
      value: 0.44,
      measuredAt: "2026-08-01T00:00:00.000Z",
      now: "2026-08-28T00:00:00.000Z",
      maxAgeDays: 14,
    });
    assert.equal(state.kind, "stale");
    assert.equal(state.display, "44% (4/9) · stale");
    assert.equal(state.sampleSize, 9);
  } finally {
    await vite.close();
  }
});
