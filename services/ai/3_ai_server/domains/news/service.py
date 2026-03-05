from domains.news.schemas import NewsInferRequest, NewsInferResponse


def infer_news(payload: NewsInferRequest) -> NewsInferResponse:
    _ = payload
    return NewsInferResponse(sentiment="NEUTRAL", score=0.5, model_version="news-v0")
