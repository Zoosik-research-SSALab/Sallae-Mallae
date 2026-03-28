const GICS_SECTOR_LABELS: Record<string, string> = {
  communicationservices: "커뮤니케이션 서비스",
  consumerdiscretionary: "자유소비재",
  consumerstaples: "필수소비재",
  energy: "에너지",
  financials: "금융",
  healthcare: "헬스케어",
  industrials: "산업재",
  informationtechnology: "정보기술",
  materials: "소재",
  realestate: "부동산",
  utilities: "유틸리티",
};

function normalizeGicsSector(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function hasHangul(value: string) {
  return /[가-힣]/.test(value);
}

function formatSectorSeparator(value: string) {
  return value.replace(/\s*\/\s*/g, " · ");
}

export function formatStockSectorLabel(value: string) {
  if (!value || hasHangul(value)) {
    return formatSectorSeparator(value);
  }

  return formatSectorSeparator(GICS_SECTOR_LABELS[normalizeGicsSector(value)] ?? value);
}
