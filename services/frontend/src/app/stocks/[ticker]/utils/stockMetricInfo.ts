export type StockMetricInfoKey = "PER" | "PSR" | "PBR" | "EPS" | "BPS" | "ROE" | "DIVIDEND_YIELD";

export type StockMetricInfo = {
  title: string;
  formula?: {
    left: string;
    right: string;
  };
  description: string;
};

export const stockMetricInfoMap: Record<StockMetricInfoKey, StockMetricInfo> = {
  PER: {
    title: "PER",
    formula: {
      left: "주가",
      right: "주당 순이익",
    },
    description:
      "PER이 낮을수록 기업이 내는 이익에 비해\n주가가 저평가되어 있다는 의미입니다.",
  },
  PSR: {
    title: "PSR",
    formula: {
      left: "주가",
      right: "주당 매출액",
    },
    description:
      "PSR이 낮을수록 기업의 매출액 대비\n주가가 저평가되어 있다는 의미입니다.",
  },
  PBR: {
    title: "PBR",
    formula: {
      left: "주가",
      right: "주당 순자산",
    },
    description:
      "PBR이 낮을수록 기업의 실제 자산가치 대비\n주가가 저평가되어 있다는 의미입니다.",
  },
  EPS: {
    title: "EPS",
    description:
      "1주당 회사가 벌어들인 순이익을 의미합니다.\n숫자가 클수록 회사의 기업 가치가 크고,\n배당을 줄 수 있는 여유가 늘어났다고 볼 수 있습니다.",
  },
  BPS: {
    title: "BPS",
    description:
      "회사가 경영을 멈추고 현재 시점의 순자산을\n주주들에게 나누어줄 경우, 한 주당 얼마씩\n줄 수 있는지를 의미합니다.\n숫자가 커질수록 회사의 기업가치가 높다고 볼 수 있습니다.",
  },
  ROE: {
    title: "ROE",
    description:
      "회사가 자기자본(주주지분)으로 1년간\n얼마를 벌어들였는지를 보여주는 지표입니다.\n부채를 통해 벌어들인 수익은 포함되지 않습니다.",
  },
  DIVIDEND_YIELD: {
    title: "배당 수익률",
    description:
      "주당 배당금을 주가로 나눈 값으로\n배당수익률이 높을수록 주가 대비\n배당금이 큰 주식이라는 의미입니다.",
  },
};
