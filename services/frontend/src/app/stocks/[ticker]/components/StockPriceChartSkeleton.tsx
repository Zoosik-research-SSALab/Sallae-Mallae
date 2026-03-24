"use client";

export default function StockPriceChartSkeleton() {
  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-[24px] bg-[color:var(--color-bg-primary)] md:h-[340px] xl:h-[360px]">
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-end px-4 text-sm font-medium text-[color:var(--color-text-tertiary)]/75 md:px-6">
        <div className="space-y-8 md:space-y-10">
          {["261,000", "208,800", "156,600", "104,400", "52,200", "0"].map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-between px-8 text-sm font-medium text-[color:var(--color-text-tertiary)]/75 md:px-10">
        {["5월", "7월", "9월", "11월", "1월", "3월"].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <svg
        viewBox="0 0 1000 360"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="chart-skeleton-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-text-danger-bold)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-text-danger-bold)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="chart-skeleton-shine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[40, 105, 170, 235, 300].map((y) => (
          <line
            key={y}
            x1="28"
            y1={y}
            x2="960"
            y2={y}
            stroke="var(--color-border-primary)"
            strokeWidth="1"
            strokeDasharray="6 5"
            opacity="0.9"
          />
        ))}

        <path
          d="M 28 290 L 96 286 L 164 292 L 232 276 L 300 280 L 368 246 L 436 254 L 504 214 L 572 222 L 640 198 L 708 142 L 776 126 L 844 82 L 912 152 L 960 118 L 960 320 L 28 320 Z"
          fill="url(#chart-skeleton-fill)"
          className="chart-skeleton-fade"
        />
        <path
          d="M 28 290 L 96 286 L 164 292 L 232 276 L 300 280 L 368 246 L 436 254 L 504 214 L 572 222 L 640 198 L 708 142 L 776 126 L 844 82 L 912 152 L 960 118"
          fill="none"
          stroke="var(--color-text-danger-bold)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="chart-skeleton-path"
        />
        <rect x="-220" y="0" width="220" height="360" fill="url(#chart-skeleton-shine)" className="chart-skeleton-glow" />
      </svg>
    </div>
  );
}
