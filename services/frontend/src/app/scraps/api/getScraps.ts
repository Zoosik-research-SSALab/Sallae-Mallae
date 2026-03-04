export type ScrapItem = {
  stockId: number;
  ticker: string;
  name: string;
  isNotiEnabled: boolean;
};

export async function getScraps(): Promise<ScrapItem[]> {
  // TODO: /api/v1/scraps API 연동
  return [
    { stockId: 1, ticker: "005930", name: "삼성전자", isNotiEnabled: true },
    { stockId: 2, ticker: "000660", name: "SK하이닉스", isNotiEnabled: false },
  ];
}
