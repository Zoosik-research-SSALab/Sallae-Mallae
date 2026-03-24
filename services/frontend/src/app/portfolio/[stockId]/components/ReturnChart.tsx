export default function ReturnChart() {
  return (
    <div className="flex flex-col gap-3 pb-4 border-b border-border-primary">
      <div className="flex flex-col gap-1">
        <h2 className="typo-heading-md font-extrabold text-text-primary">
          수익률 추이
        </h2>
        <p className="typo-body-md font-medium text-text-secondary">
          매수 시점(02.13) 이후 일별 평가 손익 추이
        </p>
      </div>

      <div
        className="relative flex items-center justify-center rounded-xl border-2 border-dashed border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-secondary)]"
        style={{ height: 340 }}
      >
        {/* Dashed grid lines */}
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute w-full border-t border-dashed border-[color:var(--color-border-primary)] opacity-50"
              style={{ top: `${(i / 5) * 100}%` }}
            />
          ))}
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute h-full border-l border-dashed border-[color:var(--color-border-primary)] opacity-50"
              style={{ left: `${(i / 5) * 100}%` }}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 text-center px-4">
          <div className="w-10 h-10 rounded-full bg-[color:var(--color-bg-tertiary)] flex items-center justify-center">
            <span className="text-lg">📈</span>
          </div>
          <p className="text-sm font-semibold text-[color:var(--color-text-secondary)]">
            차트 영역 (ECharts 연동 예정)
          </p>
          <p className="text-xs text-[color:var(--color-text-tertiary)]">
            매수일 이후 일별 평가 손익 데이터가 여기에 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
