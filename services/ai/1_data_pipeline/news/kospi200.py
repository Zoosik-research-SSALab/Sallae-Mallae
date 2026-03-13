"""
AIC 센티멘트 파이프라인 -KOSPI 200 종목 리스트 (정적 CSV 기반)

data/kospi200_list.csv 에 미리 저장된 종목 리스트를 읽어옵니다.
매번 KRX/네이버에 요청하지 않으므로 빠르고 안정적입니다.

리스트를 갱신하려면:  python kospi200.py --refresh
"""
import os
import time
import csv
import argparse

import requests
import pandas as pd
from bs4 import BeautifulSoup

# ── 경로 설정 ──
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(_BASE_DIR, "data")
KOSPI200_CSV = os.path.join(DATA_DIR, "kospi200_list.csv")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
}


# ═══════════════════════════════════════════
#  정적 CSV 로드 (기본 동작)
# ═══════════════════════════════════════════
def get_kospi200_stocks() -> pd.DataFrame:
    """
    data/kospi200_list.csv 에서 종목 코드·이름을 읽어 DataFrame으로 반환합니다.
    code 열은 6자리 문자열(앞자리 0 보존)로 보장됩니다.

    Returns
    -------
    pd.DataFrame   columns = ["code", "name"]
    """
    if not os.path.exists(KOSPI200_CSV):
        raise FileNotFoundError(
            f"종목 리스트 파일이 없습니다: {KOSPI200_CSV}\n"
            "→ python kospi200.py --refresh  명령으로 생성하세요."
        )

    df = pd.read_csv(KOSPI200_CSV, dtype={"code": str})
    # 종목코드 6자리 보장 (00660 → 000660)
    df["code"] = df["code"].str.zfill(6)
    print(f"[KOSPI200] 정적 리스트 로드 완료 -{len(df)}개 종목")
    return df


# ═══════════════════════════════════════════
#  리스트 갱신 (네이버 금융 시가총액 크롤링)
# ═══════════════════════════════════════════
def refresh_kospi200_list() -> pd.DataFrame:
    """
    네이버 금융 > KOSPI 시가총액 상위 200개 종목을 크롤링하여
    data/kospi200_list.csv 를 새로 덮어씁니다.
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    all_stocks: list[tuple[str, str]] = []

    for page in range(1, 5):  # 50개 × 4페이지 = 200개
        url = f"https://finance.naver.com/sise/sise_market_sum.naver?sosok=0&page={page}"
        resp = requests.get(url, headers=HEADERS)
        resp.encoding = "euc-kr"
        soup = BeautifulSoup(resp.text, "lxml")

        for row in soup.select("table.type_2 tr"):
            tds = row.select("td")
            if len(tds) < 6:
                continue
            a_tag = tds[1].select_one("a")
            if not a_tag:
                continue
            name = a_tag.get_text(strip=True)
            href = a_tag.get("href", "")
            code = href.split("code=")[-1] if "code=" in href else ""
            if code and name:
                all_stocks.append((code, name))

        print(f"  [Page {page}] 누적 {len(all_stocks)}개")
        time.sleep(0.3)

    # CSV 저장
    with open(KOSPI200_CSV, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["code", "name"])
        w.writerows(all_stocks)

    df = pd.DataFrame(all_stocks, columns=["code", "name"])
    print(f"\n[OK]KOSPI 200 리스트 갱신 완료 -{len(df)}개 종목 → {KOSPI200_CSV}")
    return df


# ── CLI 진입점 ──
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="KOSPI 200 종목 리스트 관리")
    parser.add_argument("--refresh", action="store_true", help="네이버 금융에서 최신 리스트를 다시 크롤링")
    args = parser.parse_args()

    if args.refresh:
        df = refresh_kospi200_list()
    else:
        df = get_kospi200_stocks()

    print(df.head(20))
    print(f"\n총 {len(df)}개 종목")
