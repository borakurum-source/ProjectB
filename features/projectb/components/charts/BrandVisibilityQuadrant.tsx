import { useState } from 'react';
import { ReportBrandMetric } from '../../services/reportData';

interface BrandVisibilityQuadrantProps {
  brands: ReportBrandMetric[];
  clientBrand: string;
  className?: string;
  isSlideMode?: boolean;
}

export function BrandVisibilityQuadrant({
  brands,
  clientBrand,
  className = '',
  isSlideMode = false,
}: BrandVisibilityQuadrantProps) {
  const [hoveredBrand, setHoveredBrand] = useState<ReportBrandMetric | null>(null);

  // Keep the axis readable even when the highest observed coverage is low.
  const maxCoverage = Math.max(...brands.map((b) => b.brandCoverage), 18);
  const maxX = Math.ceil(maxCoverage / 4) * 4;

  // Chart coordinates
  const svgWidth = 600;
  const svgHeight = 420;
  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Midpoints for quadrants
  const midX = 8; // ~8% coverage dividing Niche & Leaders
  const midY = 70; // 70% likelihood dividing Leaders/Niche & Low

  const getX = (coverage: number) => {
    const clamped = Math.max(0, Math.min(coverage, maxX));
    return padding.left + (clamped / maxX) * plotWidth;
  };

  const getY = (sentiment: number | null) => {
    const clamped = sentiment == null ? 50 : Math.max(0, Math.min(sentiment, 100));
    return padding.top + plotHeight - (clamped / 100) * plotHeight;
  };

  const midXPos = getX(midX);
  const midYPos = getY(midY);

  return (
    <div className={`relative bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-4 sm:p-6 rounded-lg ${className}`}>
      {/* Chart Title & Explanation */}
      <div className="mb-4">
        <h3 className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F8FAFC]">
          Brand Visibility Index on AI Search
        </h3>
        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
          See how visible each brand is in AI answers, based on mention frequency and average position within answers.
        </p>
      </div>

      {/* SVG Quadrant Canvas */}
      <div className="w-full flex justify-center overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[620px] h-auto select-none font-sans text-xs"
        >
          {/* Quadrant Background Shading */}
          {/* Top-Left: Niche */}
          <rect
            x={padding.left}
            y={padding.top}
            width={midXPos - padding.left}
            height={midYPos - padding.top}
            fill="currentColor"
            className="text-indigo-50/40 dark:text-indigo-950/20"
          />
          {/* Top-Right: Leaders */}
          <rect
            x={midXPos}
            y={padding.top}
            width={padding.left + plotWidth - midXPos}
            height={midYPos - padding.top}
            fill="currentColor"
            className="text-emerald-50/50 dark:text-emerald-950/25"
          />
          {/* Bottom-Left: Low Performance */}
          <rect
            x={padding.left}
            y={midYPos}
            width={midXPos - padding.left}
            height={padding.top + plotHeight - midYPos}
            fill="currentColor"
            className="text-rose-50/30 dark:text-rose-950/15"
          />
          {/* Bottom-Right: Low Conversion */}
          <rect
            x={midXPos}
            y={midYPos}
            width={padding.left + plotWidth - midXPos}
            height={padding.top + plotHeight - midYPos}
            fill="currentColor"
            className="text-amber-50/30 dark:text-amber-950/15"
          />

          {/* Quadrant Labels */}
          <text
            x={padding.left + 16}
            y={padding.top + 24}
            className="text-[12px] font-bold fill-indigo-600 dark:fill-indigo-400"
          >
            Niche
          </text>
          <text
            x={padding.left + plotWidth - 75}
            y={padding.top + 24}
            className="text-[12px] font-bold fill-emerald-600 dark:fill-emerald-400"
          >
            Leaders
          </text>
          <text
            x={padding.left + 16}
            y={padding.top + plotHeight - 14}
            className="text-[11px] font-semibold fill-slate-400 dark:fill-slate-500"
          >
            Low Performance
          </text>
          <text
            x={padding.left + plotWidth - 110}
            y={padding.top + plotHeight - 14}
            className="text-[11px] font-semibold fill-slate-400 dark:fill-slate-500"
          >
            Low Conversion
          </text>

          {/* Grid lines */}
          <line
            x1={midXPos}
            y1={padding.top}
            x2={midXPos}
            y2={padding.top + plotHeight}
            stroke="#CBD5E1"
            strokeDasharray="4 4"
            className="dark:stroke-slate-700"
          />
          <line
            x1={padding.left}
            y1={midYPos}
            x2={padding.left + plotWidth}
            y2={midYPos}
            stroke="#CBD5E1"
            strokeDasharray="4 4"
            className="dark:stroke-slate-700"
          />

          {/* X & Y Axis Lines */}
          <line
            x1={padding.left}
            y1={padding.top + plotHeight}
            x2={padding.left + plotWidth}
            y2={padding.top + plotHeight}
            stroke="#94A3B8"
            strokeWidth="1.5"
            className="dark:stroke-slate-600"
          />
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + plotHeight}
            stroke="#94A3B8"
            strokeWidth="1.5"
            className="dark:stroke-slate-600"
          />

          {/* X-Axis Ticks & Labels */}
          {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18].filter((t) => t <= maxX).map((tick) => {
            const x = getX(tick);
            return (
              <g key={`xtick-${tick}`}>
                <line
                  x1={x}
                  y1={padding.top + plotHeight}
                  x2={x}
                  y2={padding.top + plotHeight + 5}
                  stroke="#94A3B8"
                />
                <text
                  x={x}
                  y={padding.top + plotHeight + 18}
                  textAnchor="middle"
                  className="text-[10px] fill-[#64748B] dark:fill-[#94A3B8] font-mono"
                >
                  {tick}%
                </text>
              </g>
            );
          })}
          <text
            x={padding.left + plotWidth / 2}
            y={svgHeight - 10}
            textAnchor="middle"
            className="text-[11px] font-bold fill-[#475569] dark:fill-[#94A3B8] uppercase tracking-wider"
          >
            Brand Coverage (%)
          </text>

          {/* Y-Axis Ticks & Labels */}
          {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((tick) => {
            const y = getY(tick);
            return (
              <g key={`ytick-${tick}`}>
                <line
                  x1={padding.left - 5}
                  y1={y}
                  x2={padding.left}
                  y2={y}
                  stroke="#94A3B8"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-[#64748B] dark:fill-[#94A3B8] font-mono"
                >
                  {tick}%
                </text>
              </g>
            );
          })}
          <text
            x={-svgHeight / 2}
            y={16}
            transform="rotate(-90)"
            textAnchor="middle"
            className="text-[11px] font-bold fill-[#475569] dark:fill-[#94A3B8] uppercase tracking-wider"
          >
            Likelihood to buy (%)
          </text>

          {/* Plotted Brand Nodes */}
          {brands.map((b) => {
            const cx = getX(b.brandCoverage);
            const cy = getY(b.sentimentScore);
            const isClient = b.isClient;
            const isHovered = hoveredBrand?.brand === b.brand;

            const initials = b.brand
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <g
                key={b.brand}
                className="cursor-pointer transition-transform duration-150"
                onMouseEnter={() => setHoveredBrand(b)}
                onMouseLeave={() => setHoveredBrand(null)}
              >
                {/* Outer halo for client */}
                {isClient && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 18 : 14}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    className="animate-spin"
                    style={{ transformOrigin: `${cx}px ${cy}px`, animationDuration: '6s' }}
                  />
                )}

                {/* Main Node Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isClient ? 11 : isHovered ? 9 : 7}
                  fill={
                    isClient
                      ? '#10B981'
                      : b.quadrant === 'Leader'
                      ? '#059669'
                      : b.quadrant === 'Niche'
                      ? '#4F46E5'
                      : '#64748B'
                  }
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  className="shadow-md"
                />

                {/* Initials / Icon */}
                <text
                  x={cx}
                  y={cy + 3}
                  textAnchor="middle"
                  className="text-[8px] font-black fill-white pointer-events-none"
                >
                  {initials[0]}
                </text>

                {/* Brand Name Label Tag */}
                <text
                  x={cx + (isClient ? 14 : 10)}
                  y={cy - 6}
                  className={`text-[10px] font-bold ${
                    isClient
                      ? 'fill-[#047857] dark:fill-[#34D399] font-black'
                      : isHovered
                      ? 'fill-[#111827] dark:fill-[#F8FAFC]'
                      : 'fill-[#334155] dark:fill-[#CBD5E1]'
                  }`}
                >
                  {b.brand}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hovered Brand Tooltip Info */}
      {hoveredBrand && (
        <div className="mt-3 p-2.5 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                hoveredBrand.isClient
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#E2E8F0] dark:bg-slate-700 text-[#1E293B] dark:text-[#F8FAFC]'
              }`}
            >
              {hoveredBrand.quadrant}
            </span>
            <strong className="text-[#1E293B] dark:text-[#F8FAFC]">{hoveredBrand.brand}</strong>
            {hoveredBrand.isClient && <span className="text-emerald-600 font-semibold">(Your Brand)</span>}
          </div>
          <div className="flex items-center gap-4 text-[#64748B] dark:text-[#94A3B8] font-mono text-[11px]">
            <span>Coverage: <strong>{hoveredBrand.brandCoverage}%</strong></span>
                <span>Observed sentiment: <strong>{hoveredBrand.sentimentScore == null ? 'Unknown' : `${hoveredBrand.sentimentScore}%`}</strong></span>
            <span>Mentions: <strong>{hoveredBrand.mentions}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
