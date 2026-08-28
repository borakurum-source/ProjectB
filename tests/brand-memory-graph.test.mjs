import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

async function createTestServer() {
  return createServer({
    appType: "custom",
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } },
  });
}

async function load(module) {
  const vite = await createTestServer();
  return { vite, value: await vite.ssrLoadModule(module) };
}

test("derives a connected neural graph from brand memory items", async () => {
  const vite = await createTestServer();
  try {
    const graphModule = await vite.ssrLoadModule("/features/projectb/services/brandMemoryGraph.ts");
    const graph = graphModule.buildBrandKnowledgeGraph(
      { id: "client-1", brandName: "Acme" },
      [
        { id: "item-1", title: "Pricing", entityType: "pricing_plan", content: "Plans" },
        { id: "item-2", title: "Product", entityType: "product_feature", content: "Feature" },
      ],
    );

    assert.equal(graph.nodes.length, 3);
    assert.equal(graph.links.length, 2);
    assert.equal(graph.nodes[0].id, "brand:client-1");
    assert.equal(graph.nodes[0].type, "brand");
    assert.deepEqual(graph.links.map((link) => link.source), ["brand:client-1", "brand:client-1"]);
    assert.ok(graph.nodes.slice(1).every((node) => Number.isFinite(node.x) && Number.isFinite(node.y) && Number.isFinite(node.z)));
  } finally {
    await vite.close();
  }
});

test("returns no graph for an empty memory collection", async () => {
  const vite = await createTestServer();
  try {
    const graphModule = await vite.ssrLoadModule("/features/projectb/services/brandMemoryGraph.ts");
    assert.equal(graphModule.buildBrandKnowledgeGraph({ id: "client-1", brandName: "Acme" }, []), null);
  } finally {
    await vite.close();
  }
});

test("exposes a deterministic synapse marker position for the 3D canvas", async () => {
  const { vite, value: { synapsePoint } } = await load("/features/projectb/components/BrandNeuralBrain3D.tsx");
  try {
    assert.deepEqual(synapsePoint({ x: 10, y: 20 }, { x: 30, y: 40 }), { x: 20, y: 30 });
  } finally { await vite.close(); }
});
