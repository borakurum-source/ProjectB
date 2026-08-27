import React, { useRef, useEffect, useState } from 'react';
import { Brain, RotateCcw, Eye, Sparkles, Filter, Activity, Zap, Layers } from 'lucide-react';
import { BrandKnowledgeGraph, BrandGraphNode, BrandMemoryItem, BrandMemoryEntityType } from '../types';

interface BrandNeuralBrain3DProps {
  graph: BrandKnowledgeGraph | null;
  items: BrandMemoryItem[];
  selectedItem: BrandMemoryItem | null;
  onSelectItem: (item: BrandMemoryItem) => void;
}

export const BrandNeuralBrain3D: React.FC<BrandNeuralBrain3DProps> = ({
  graph,
  items,
  selectedItem,
  onSelectItem,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [hoveredNode, setHoveredNode] = useState<BrandGraphNode | null>(null);

  // 3D camera angles & zoom
  const rotXRef = useRef<number>(0.25);
  const rotYRef = useRef<number>(0.35);
  const zoomRef = useRef<number>(1.0);
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const projectedNodesRef = useRef<Array<BrandGraphNode & { px: number; py: number; pz: number; radius: number }>>([]);

  const handleResetCamera = () => {
    rotXRef.current = 0.25;
    rotYRef.current = 0.35;
    zoomRef.current = 1.0;
  };

  useEffect(() => {
    if (!graph || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const width = canvas.parentElement?.clientWidth || 700;
    const height = 480;
    canvas.width = width;
    canvas.height = height;

    const centerX = width / 2;
    const centerY = height / 2;

    // Synaptic electrical pulses traveling on axon links
    const synapseParticles: Array<{
      sourceId: string;
      targetId: string;
      progress: number;
      speed: number;
      color: string;
    }> = [];

    // Initialize 30 continuous synaptic pulse sparks
    if (graph.links.length > 0) {
      for (let i = 0; i < 30; i++) {
        const link = graph.links[i % graph.links.length];
        synapseParticles.push({
          sourceId: link.source,
          targetId: link.target,
          progress: Math.random(),
          speed: 0.005 + Math.random() * 0.009,
          color: i % 3 === 0 ? '#38BDF8' : i % 3 === 1 ? '#A855F7' : '#34D399',
        });
      }
    }

    let pulseTime = 0;

    const render = () => {
      pulseTime += 0.035;
      // Gentle auto-rotation drift when user is not dragging
      if (!isDraggingRef.current) {
        rotYRef.current += 0.0018;
      }

      ctx.clearRect(0, 0, width, height);

      // Deep cyber neural background gradient
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 40, centerX, centerY, width / 1.3);
      bgGrad.addColorStop(0, '#0B0F19');
      bgGrad.addColorStop(0.55, '#05070D');
      bgGrad.addColorStop(1, '#020306');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle neural coordinate grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
      ctx.lineWidth = 1;
      const step = 48;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const rotX = rotXRef.current;
      const rotY = rotYRef.current;
      const zoom = zoomRef.current;

      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      // 3D Rotation and Perspective Projection of Nodes
      const projectedNodes: Array<BrandGraphNode & { px: number; py: number; pz: number; radius: number }> = [];

      graph.nodes.forEach((node) => {
        const rawX = (node.x || 0) * zoom;
        const rawY = (node.y || 0) * zoom;
        const rawZ = (node.z || 0) * zoom;

        // Y-axis rotation
        const x1 = rawX * cosY - rawZ * sinY;
        const z1 = rawZ * cosY + rawX * sinY;

        // X-axis rotation
        const y2 = rawY * cosX - z1 * sinX;
        const z2 = z1 * cosX + rawY * sinX;

        // Perspective projection
        const fov = 450;
        const scale = fov / (fov + z2 + 260);
        const px = centerX + x1 * scale;
        const py = centerY + y2 * scale;
        const radius = Math.max(4, node.val * scale * 0.9);

        projectedNodes.push({
          ...node,
          px,
          py,
          pz: z2,
          radius,
        });
      });

      // Sort by Z depth so farther nodes and links draw first
      projectedNodes.sort((a, b) => b.pz - a.pz);
      projectedNodesRef.current = projectedNodes;

      // Draw Synaptic Link Axons
      graph.links.forEach((link) => {
        const src = projectedNodes.find((n) => n.id === link.source);
        const tgt = projectedNodes.find((n) => n.id === link.target);
        if (!src || !tgt) return;

        // Hide links if filtered out
        if (filterType !== 'all' && src.type !== filterType && tgt.type !== filterType && src.type !== 'brand') {
          return;
        }

        const isCompetitor = link.label?.includes('competitor');
        const isGsc = link.label?.includes('gsc');
        const isAi = link.label?.includes('ai');

        ctx.beginPath();
        const grad = ctx.createLinearGradient(src.px, src.py, tgt.px, tgt.py);
        if (isCompetitor) {
          grad.addColorStop(0, 'rgba(244, 63, 94, 0.45)');
          grad.addColorStop(1, 'rgba(225, 29, 72, 0.15)');
        } else if (isGsc) {
          grad.addColorStop(0, 'rgba(14, 165, 233, 0.6)');
          grad.addColorStop(1, 'rgba(2, 132, 199, 0.2)');
        } else if (isAi) {
          grad.addColorStop(0, 'rgba(168, 85, 247, 0.6)');
          grad.addColorStop(1, 'rgba(126, 34, 206, 0.2)');
        } else {
          grad.addColorStop(0, 'rgba(99, 102, 241, 0.55)');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0.25)');
        }

        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(1, 1.6 * ((src.radius + tgt.radius) / 24));
        ctx.moveTo(src.px, src.py);
        ctx.lineTo(tgt.px, tgt.py);
        ctx.stroke();
      });

      // Draw Synaptic Pulses (Traveling action potential sparks)
      synapseParticles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;

        const src = projectedNodes.find((n) => n.id === p.sourceId);
        const tgt = projectedNodes.find((n) => n.id === p.targetId);
        if (!src || !tgt) return;

        const sx = src.px + (tgt.px - src.px) * p.progress;
        const sy = src.py + (tgt.py - src.py) * p.progress;

        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      // Draw 3D Nodes (Neural Cell Bodies)
      projectedNodes.forEach((node) => {
        const isBrand = node.type === 'brand';
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = selectedItem?.id === node.id;
        const isDimmed = filterType !== 'all' && node.type !== filterType && !isBrand;

        const alpha = isDimmed ? 0.2 : 1.0;
        const pulse = isBrand ? Math.sin(pulseTime) * 3 : Math.sin(pulseTime + node.radius) * 1.5;
        const currentRadius = node.radius + pulse;

        // 1. Glowing Halo / Synaptic Ring
        ctx.beginPath();
        ctx.arc(node.px, node.py, currentRadius * 1.8, 0, Math.PI * 2);
        const haloGrad = ctx.createRadialGradient(
          node.px,
          node.py,
          currentRadius * 0.5,
          node.px,
          node.py,
          currentRadius * 1.8
        );
        haloGrad.addColorStop(0, node.color ? `${node.color}66` : 'rgba(99, 102, 241, 0.35)');
        haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = haloGrad;
        ctx.globalAlpha = alpha;
        ctx.fill();

        // 2. Node Core Solid
        ctx.beginPath();
        ctx.arc(node.px, node.py, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = node.color || '#6366F1';
        ctx.globalAlpha = alpha;
        ctx.fill();

        // 3. Node Border Ring & Selection Glow
        ctx.strokeStyle = isSelected ? '#38BDF8' : isHovered ? '#FFFFFF' : '#0F172A';
        ctx.lineWidth = isSelected || isHovered ? 2.5 : 1.2;
        ctx.stroke();

        // 4. Central Pulse Ripple for Brand Hub
        if (isBrand) {
          ctx.beginPath();
          ctx.arc(node.px, node.py, currentRadius * 2.4, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // 5. Node Text Label
        if (!isDimmed) {
          ctx.fillStyle = isBrand ? '#F8FAFC' : '#E2E8F0';
          ctx.font = isBrand ? 'bold 11px system-ui, sans-serif' : '9px system-ui, sans-serif';
          ctx.textAlign = 'center';
          const labelText = node.label.length > 18 ? `${node.label.slice(0, 16)}...` : node.label;
          ctx.fillText(labelText, node.px, node.py + currentRadius + 12);
        }

        ctx.globalAlpha = 1.0; // reset alpha
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Mouse Drag Orbit & Click Interaction Listeners
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isDraggingRef.current) {
        const deltaX = e.clientX - lastMousePosRef.current.x;
        const deltaY = e.clientY - lastMousePosRef.current.y;
        rotYRef.current += deltaX * 0.008;
        rotXRef.current -= deltaY * 0.008;
        // Limit X rotation to avoid flipping
        rotXRef.current = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, rotXRef.current));
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      } else {
        // Check hover
        const hovered = projectedNodesRef.current.find((n) => {
          const dx = n.px - mouseX;
          const dy = n.py - mouseY;
          return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
        });
        setHoveredNode(hovered || null);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      zoomRef.current = Math.max(0.6, Math.min(2.4, zoomRef.current * zoomFactor));
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const clicked = projectedNodesRef.current.find((n) => {
        const dx = n.px - clickX;
        const dy = n.py - clickY;
        return Math.sqrt(dx * dx + dy * dy) <= n.radius + 8;
      });

      if (clicked && clicked.type !== 'brand') {
        const found = items.find((i) => i.id === clicked.id);
        if (found) onSelectItem(found);
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('click', handleClick);
    };
  }, [graph, items, filterType, selectedItem, onSelectItem]);

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 flex flex-col justify-between relative shadow-xs min-h-[520px]">
      {/* Top Canvas Bar with Category Filter */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#E5E7EB] dark:border-[#1E293B] mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            3D Neural Synapses Matrix
          </span>
          <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">Drag to orbit 360° • Scroll to zoom</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetCamera}
            className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-white dark:bg-[#1E293B] hover:bg-[#F9FAFB] dark:hover:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] rounded border border-[#E5E7EB] dark:border-[#334155] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset 3D Camera"
          >
            <RotateCcw className="w-3 h-3" />
            Reset View
          </button>
        </div>
      </div>

      {/* Neural Synapse Legend / Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 text-[11px]">
        <button
          onClick={() => setFilterType('all')}
          className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
            filterType === 'all' 
              ? 'bg-[#111827] dark:bg-[#4338CA] text-white border-[#111827] dark:border-[#4338CA]' 
              : 'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#4B5563] dark:text-[#94A3B8] border-[#E5E7EB] dark:border-[#334155] hover:border-[#9CA3AF]'
          }`}
        >
          All Synapses ({graph?.nodes.length || 0})
        </button>
        <button
          onClick={() => setFilterType('feature')}
          className={`px-2.5 py-1 rounded border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
            filterType === 'feature' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700' 
              : 'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#4B5563] dark:text-[#94A3B8] border-[#E5E7EB] dark:border-[#334155] hover:border-[#9CA3AF]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Features & Menu
        </button>
        <button
          onClick={() => setFilterType('pricing')}
          className={`px-2.5 py-1 rounded border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
            filterType === 'pricing' 
              ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700' 
              : 'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#4B5563] dark:text-[#94A3B8] border-[#E5E7EB] dark:border-[#334155] hover:border-[#9CA3AF]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pricing Plans
        </button>
        <button
          onClick={() => setFilterType('competitor')}
          className={`px-2.5 py-1 rounded border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
            filterType === 'competitor' 
              ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700' 
              : 'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#4B5563] dark:text-[#94A3B8] border-[#E5E7EB] dark:border-[#334155] hover:border-[#9CA3AF]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Competitors
        </button>
        <button
          onClick={() => setFilterType('gsc_query')}
          className={`px-2.5 py-1 rounded border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
            filterType === 'gsc_query' 
              ? 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-700' 
              : 'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#4B5563] dark:text-[#94A3B8] border-[#E5E7EB] dark:border-[#334155] hover:border-[#9CA3AF]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span> GSC Demands
        </button>
        <button
          onClick={() => setFilterType('ai_insight')}
          className={`px-2.5 py-1 rounded border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
            filterType === 'ai_insight' 
              ? 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700' 
              : 'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#4B5563] dark:text-[#94A3B8] border-[#E5E7EB] dark:border-[#334155] hover:border-[#9CA3AF]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> AI Perceptions
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80 text-center space-y-3 bg-[#F9FAFB] dark:bg-[#0B0F17] border border-dashed border-[#E5E7EB] dark:border-[#1E293B] rounded">
          <Brain className="w-10 h-10 text-[#9CA3AF] opacity-50" />
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] max-w-sm">
            Marka beyninde henüz indekslenmiş varlık yok. Yukarıdaki kutuya web sitesi adresini girip &quot;Crawl &amp; Ingest&quot; veya &quot;Sync Cross-Functional Signals&quot; butonuna basarak ilk nöral hafıza parçalarını oluşturun.
          </p>
        </div>
      ) : (
        <div className="relative w-full h-[420px] rounded overflow-hidden border border-[#111827] dark:border-[#1E293B] bg-[#050811]">
          <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
        </div>
      )}
    </div>
  );
};
