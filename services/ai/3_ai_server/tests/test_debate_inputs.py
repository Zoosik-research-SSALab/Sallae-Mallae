from __future__ import annotations

import unittest
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from domains.debate.models import (
    AiMlReport,
    DebateStock,
    MlEnsemblePrediction,
    MlGarchPrediction,
    MlLgbmPrediction,
    MlLstmPrediction,
    StockFinancial,
    StockNews,
    StockNewsMap,
)
from domains.debate.service import get_debate_inputs


class DebateInputsServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:")
        DebateStock.__table__.create(self.engine)
        StockFinancial.__table__.create(self.engine)
        AiMlReport.__table__.create(self.engine)
        MlEnsemblePrediction.__table__.create(self.engine)
        MlLgbmPrediction.__table__.create(self.engine)
        MlLstmPrediction.__table__.create(self.engine)
        MlGarchPrediction.__table__.create(self.engine)
        StockNews.__table__.create(self.engine)
        StockNewsMap.__table__.create(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)

    def tearDown(self) -> None:
        self.engine.dispose()

    def test_inputs_can_use_prediction_rows_without_ai_ml_report(self) -> None:
        session = self.session_factory()
        try:
            session.add(
                DebateStock(id=1, ticker="005930", name="삼성전자", market_type="KOSPI", is_active=True)
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

            self.assertIsNone(response.personas.chart.ai_ml_report)
            self.assertIsNotNone(response.personas.chart.lgbm_prediction)
            self.assertEqual(response.personas.chart.lgbm_prediction.model_version, "v1.0")
        finally:
            session.close()


if __name__ == "__main__":
    unittest.main()
