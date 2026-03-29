from __future__ import annotations

import unittest
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from domains.debate.models import (
    DebateStock,
    MlEnsemblePrediction,
    MlGarchPrediction,
    MlLgbmPrediction,
    MlTftPrediction,
    NewsAgentStockData,
    StockFinancial,
)
from domains.debate.service import get_debate_inputs


class DebateInputsServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:")
        DebateStock.__table__.create(self.engine)
        StockFinancial.__table__.create(self.engine)
        MlEnsemblePrediction.__table__.create(self.engine)
        MlLgbmPrediction.__table__.create(self.engine)
        MlTftPrediction.__table__.create(self.engine)
        MlGarchPrediction.__table__.create(self.engine)
        NewsAgentStockData.__table__.create(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)

    def tearDown(self) -> None:
        self.engine.dispose()

    def test_inputs_can_use_prediction_rows_without_snapshot_table(self) -> None:
        session = self.session_factory()
        try:
            session.add(
                DebateStock(id=1, ticker="005930", name="삼성전자", market_type="KOSPI", is_active=True)
            )
            session.add(
                MlEnsemblePrediction(
                    id=11,
                    stock_id=1,
                    report_date=date(2026, 3, 16),
                    model_version="v1.0",
                    ensemble_result=2,
                    ensemble_confidence=0.83,
                )
            )
            session.add(
                MlLgbmPrediction(
                    id=1,
                    stock_id=1,
                    report_date=date(2026, 3, 16),
                    model_version="v1.0",
                    predicted_class=2,
                    confidence=0.81,
                    prob_down=0.05,
                    prob_sideways=0.14,
                    prob_up=0.81,
                )
            )
            session.add(
                MlTftPrediction(
                    id=1,
                    stock_id=1,
                    report_date=date(2026, 3, 16),
                    model_version="v1.0",
                    group_id="grp-1",
                    prob=0.79,
                    pred=2,
                )
            )
            session.add(
                MlGarchPrediction(
                    id=21,
                    stock_id=1,
                    report_date=date(2026, 3, 16),
                    model_version="v1.0",
                    vol_1d=0.4,
                )
            )
            session.add(
                NewsAgentStockData(
                    id=1,
                    stock_id=1,
                    report_date=date(2026, 3, 16),
                    top_keywords=[
                        {
                            "keyword": "실적",
                            "mention_count": 5,
                            "news": [
                                {
                                    "news_id": 10,
                                    "title": "실적 개선 기대",
                                    "snippet": "테스트",
                                    "url": "https://example.com/news/10",
                                }
                            ],
                        }
                    ],
                    sentiment={"total": 1, "positive": 1},
                )
            )
            session.commit()

            response = get_debate_inputs(
                session,
                stock_id=1,
                report_date=date(2026, 3, 16),
                debate_version="debate-v1",
                model_version=None,
                news_limit=5,
                financial_limit=2,
            )

            self.assertIsNotNone(response.personas.chart.lgbm_prediction)
            self.assertEqual(response.personas.chart.lgbm_prediction.model_version, "v1.0")
            self.assertIsNotNone(response.personas.chart.tft_prediction)
            self.assertEqual(response.personas.news.top_keywords[0].keyword, "실적")
        finally:
            session.close()


if __name__ == "__main__":
    unittest.main()
