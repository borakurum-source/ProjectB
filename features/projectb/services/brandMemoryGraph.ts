import type { BrandGraphNode, BrandKnowledgeGraph, BrandMemoryEntityType, BrandMemoryItem, Client } from '../types';

type GraphItem = Pick<BrandMemoryItem, 'id' | 'title' | 'entityType' | 'content'>;

const entityNodeType: Record<BrandMemoryEntityType, BrandGraphNode['type']> = {
  company_overview: 'product',
  product_feature: 'feature',
  pricing_plan: 'pricing',
  competitor_diff: 'competitor',
  use_case: 'product',
  citation_source: 'source',
  target_audience: 'product',
  faq_fact: 'product',
  ai_perception_insight: 'ai_insight',
  gsc_demand_query: 'gsc_query',
  ga4_engagement_signal: 'synapse',
};

const entityColor: Record<BrandGraphNode['type'], string> = {
  brand: '#6366F1',
  product: '#3B82F6',
  feature: '#10B981',
  pricing: '#F59E0B',
  competitor: '#F43F5E',
  source: '#818CF8',
  gsc_query: '#0EA5E9',
  ai_insight: '#A855F7',
  synapse: '#14B8A6',
};

function nodePosition(index: number, total: number) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const ring = 150 + (index % 3) * 42;
  return {
    x: Math.cos(angle) * ring,
    y: Math.sin(angle) * ring * 0.72,
    z: ((index % 5) - 2) * 78,
  };
}

/**
 * Build the graph from persisted memory units. The API intentionally returns
 * only units, so this deterministic projection keeps the 3D canvas client-side
 * and guarantees every visible unit has a real synapse to the brand hub.
 */
export function buildBrandKnowledgeGraph(
  client: Pick<Client, 'id' | 'brandName'>,
  items: GraphItem[],
): BrandKnowledgeGraph | null {
  if (items.length === 0) return null;

  const brandId = `brand:${client.id}`;
  const nodes: BrandGraphNode[] = [{
    id: brandId,
    label: client.brandName,
    type: 'brand',
    val: 34,
    color: entityColor.brand,
    details: 'Brand Memory hub',
    x: 0,
    y: 0,
    z: 0,
  }];

  const links = items.map((item, index) => {
    const type = entityNodeType[item.entityType] || 'product';
    const position = nodePosition(index, items.length);
    nodes.push({
      id: item.id,
      label: item.title || 'Untitled memory',
      type,
      val: Math.max(9, Math.min(22, 9 + Math.round((item.content || '').length / 220))),
      color: entityColor[type],
      details: item.content,
      ...position,
    });
    return {
      source: brandId,
      target: item.id,
      label: `${item.entityType} synapse`,
      strength: 0.65 + (index % 4) * 0.08,
    };
  });

  return { nodes, links };
}
