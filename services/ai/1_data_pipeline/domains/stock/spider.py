from typing import Dict, List


def crawl_stock() -> List[Dict[str, str]]:
    return [
        {"ticker": "005930", "name": "삼성전자", "market_type": "KOSPI"},
        {"ticker": "000660", "name": "SK하이닉스", "market_type": "KOSPI"},
    ]
