from domains.news.sentiment_analyzer import train_sentiment_analyzer
from domains.stock.price_predictor import train_price_predictor


def main() -> None:
    stock_model_path = train_price_predictor()
    news_model_path = train_sentiment_analyzer()

    print(f"[train] stock model: {stock_model_path}")
    print(f"[train] news model: {news_model_path}")
    print("[train] done")


if __name__ == "__main__":
    main()
