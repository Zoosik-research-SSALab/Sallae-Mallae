from domains.finance.spider import crawl_finance
from domains.news.spider import crawl_news
from domains.stock.spider import crawl_stock


def main() -> None:
    stock_rows = crawl_stock()
    news_rows = crawl_news()
    finance_rows = crawl_finance()

    print(f"[crawler] stock rows: {len(stock_rows)}")
    print(f"[crawler] news rows: {len(news_rows)}")
    print(f"[crawler] finance rows: {len(finance_rows)}")
    print("[crawler] done")


if __name__ == "__main__":
    main()
