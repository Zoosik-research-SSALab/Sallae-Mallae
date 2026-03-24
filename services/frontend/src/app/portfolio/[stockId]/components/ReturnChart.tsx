"use client";

import type { PerformanceChartPoint } from "../types/api";

type Props = {
  chart: PerformanceChartPoint[];
  currentReturn: number;
  buyDate: string;
};

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}.${dd}`;
}

const VIEW_WIDTH = 700;
const VIEW_HEIGHT = 280;
const PAD_TOP = 32;
const PAD_BOTTOM = 48;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;

const CHART_LEFT = PAD_LEFT;
const CHART_RIGHT = VIEW_WIDTH - PAD_RIGHT;
const CHART_TOP = PAD_TOP;
const CHART_BOTTOM = VIEW_HEIGHT - PAD_BOTTOM;
const CHART_WIDTH = CHART_RIGHT - CHART_LEFT;
const CHART_HEIGHT = CHART_BOTTOM - CHART_TOP;

export default function ReturnChart({ chart, currentReturn, buyDate }: Props) {
  const isEmpty = !chart || chart.length === 0;

  // Map data points to SVG coordinates
  const points: { x: number; y: number }[] = [];
  if (!isEmpty) {
    const prices = chart.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    chart.forEach((p, i) => {
      const x = CHART_LEFT + (i / Math.max(chart.length - 1, 1)) * CHART_WIDTH;
      const y =
        CHART_BOTTOM -
        ((p.price - minPrice) / priceRange) * CHART_HEIGHT;
      points.push({ x, y });
    });
  }

  // Build polyline points string
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Area fill path: line + close at bottom
  let areaPath = "";
  if (points.length > 0) {
    const start = points[0];
    const end = points[points.length - 1];
    areaPath =
      `M ${start.x},${start.y} ` +
      points.slice(1).map((p) => `L ${p.x},${p.y}`).join(" ") +
      ` L ${end.x},${CHART_BOTTOM} L ${start.x},${CHART_BOTTOM} Z`;
  }

  // Last point for badge
  const lastPoint = points.length > 0 ? points[points.length - 1] : null;

  // 4 evenly spaced horizontal dashed grid lines
  const gridLines = [1, 2, 3, 4].map((i) => {
    const y = CHART_TOP + (i / 5) * CHART_HEIGHT;
    return y;
  });

  // Return label: sign + value
  const returnSign = currentReturn >= 0 ? "+" : "";
  const returnLabel = `${returnSign}${currentReturn.toFixed(1)}%`;

  // Badge dimensions
  const BADGE_HEIGHT = 22;
  const BADGE_PADDING_X = 8;
  // Estimate badge width based on text length
  const badgeCharWidth = 7.5;
  const BADGE_WIDTH = returnLabel.length * badgeCharWidth + BADGE_PADDING_X * 2;

  return (
    <div className="flex flex-col gap-3 pb-4 border-b border-border-primary">
      {/* Section header */}
      <div className="flex flex-col gap-1">
        <h2 className="typo-heading-md font-extrabold text-text-primary">
          수익률 추이
        </h2>
        <p className="typo-body-md font-medium text-text-secondary">
          매수 시점({formatShortDate(buyDate)}) 이후 일별 평가 손익 추이
        </p>
      </div>

      {/* Chart container */}
      <div className="rounded-xl border border-border-primary bg-[color:var(--color-bg-primary)] overflow-hidden">
        {isEmpty ? (
          <div className="flex items-center justify-center h-40">
            <p className="typo-body-sm text-text-tertiary">
              차트 데이터가 없습니다.
            </p>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            width="100%"
            style={{ display: "block" }}
          >
            {/* Dashed grid lines */}
            {gridLines.map((y, idx) => (
              <line
                key={idx}
                x1={CHART_LEFT}
                y1={y}
                x2={CHART_RIGHT}
                y2={y}
                stroke="var(--color-border-primary)"
                strokeWidth="1"
                strokeDasharray="6 4"
              />
            ))}

            {/* Middle solid line */}
            <line
              x1={CHART_LEFT}
              y1={CHART_TOP + CHART_HEIGHT / 2}
              x2={CHART_RIGHT}
              y2={CHART_TOP + CHART_HEIGHT / 2}
              stroke="var(--color-border-primary)"
              strokeWidth="1"
            />

            {/* Area fill */}
            <path
              d={areaPath}
              fill="var(--color-text-danger)"
              fillOpacity="0.08"
            />

            {/* Price line */}
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="var(--color-text-danger)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Last data point dot + badge */}
            {lastPoint && (
              <>
                {/* Red filled circle with white border */}
                <circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r="5"
                  fill="var(--color-text-danger)"
                  stroke="var(--color-bg-primary)"
                  strokeWidth="2"
                />

                {/* Badge: position above the dot, clamped within viewBox */}
                {(() => {
                  const badgeX = Math.min(
                    Math.max(lastPoint.x - BADGE_WIDTH / 2, CHART_LEFT),
                    CHART_RIGHT - BADGE_WIDTH
                  );
                  const badgeY = lastPoint.y - BADGE_HEIGHT - 10;
                  const clampedBadgeY = Math.max(badgeY, CHART_TOP);

                  return (
                    <g>
                      <rect
                        x={badgeX}
                        y={clampedBadgeY}
                        width={BADGE_WIDTH}
                        height={BADGE_HEIGHT}
                        rx="6"
                        ry="6"
                        fill="var(--color-text-danger)"
                      />
                      <text
                        x={badgeX + BADGE_WIDTH / 2}
                        y={clampedBadgeY + BADGE_HEIGHT / 2 + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="inherit"
                      >
                        {returnLabel}
                      </text>
                    </g>
                  );
                })()}
              </>
            )}
          </svg>
        )}

        {/* Bottom axis labels */}
        {!isEmpty && (
          <div className="flex justify-between px-2 pb-3 -mt-1">
            <span className="typo-body-sm text-text-tertiary">
              {formatShortDate(buyDate)} 매수
            </span>
            <span className="typo-body-sm text-text-tertiary">현재</span>
          </div>
        )}
      </div>
    </div>
  );
}
