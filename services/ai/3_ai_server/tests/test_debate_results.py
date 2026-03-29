from __future__ import annotations

import unittest
from datetime import date
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.exceptions import BusinessException
from domains.debate.models import AiDebateReport, DebateStock
from domains.debate.schemas import DebateResultRequest
from domains.debate.service import save_debate_result


class DebateResultsServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:")
        DebateStock.__table__.create(self.engine)
        AiDebateReport.__table__.create(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)

    def tearDown(self) -> None:
        self.engine.dispose()

    def test_save_debate_result_creates_report_when_payload_is_valid(self) -> None:
        session = self.session_factory()
        try:
            session.add(
                DebateStock(id=1, ticker="005930", name="삼성전자", market_type="KOSPI", is_active=True)
            )
            session.commit()

            payload = DebateResultRequest(
                stock_id=1,
                ticker="005930",
                report_date=date(2026, 3, 16),
                debate_version="debate-v1",
                chairman_signal="BUY",
                debate_confidence=0.82,
                debate_summary={"summary": "positive"},
                final_stances={"chairman": "BUY"},
                debate_full_log={"rounds": []},
                chairman_report="test report",
            )

            with patch("domains.debate.service.crud.create_debate_report") as mock_create:
                response = save_debate_result(session, payload)

            self.assertEqual(response.result, "created")
            self.assertEqual(response.stock_id, 1)
            self.assertEqual(response.debate_version, "debate-v1")
            mock_create.assert_called_once_with(
                session,
                stock_id=1,
                report_date=date(2026, 3, 16),
                debate_version="debate-v1",
                chairman_signal="BUY",
                debate_confidence=0.82,
                debate_summary={"summary": "positive"},
                final_stances={"chairman": "BUY"},
                debate_full_log={"rounds": []},
                chairman_report="test report",
            )
        finally:
            session.close()

    def test_save_debate_result_returns_duplicated_when_report_already_exists(self) -> None:
        session = self.session_factory()
        try:
            session.add(
                DebateStock(id=1, ticker="005930", name="삼성전자", market_type="KOSPI", is_active=True)
            )
            session.add(
                AiDebateReport(
                    id=1,
                    stock_id=1,
                    report_date=date(2026, 3, 16),
                    debate_version="debate-v1",
                    chairman_signal="BUY",
                )
            )
            session.commit()

            payload = DebateResultRequest(
                stock_id=1,
                ticker="005930",
                report_date=date(2026, 3, 16),
                debate_version="debate-v1",
            )

            with patch("domains.debate.service.crud.create_debate_report") as mock_create:
                response = save_debate_result(session, payload)

            self.assertEqual(response.result, "duplicated")
            mock_create.assert_not_called()
        finally:
            session.close()

    def test_save_debate_result_rejects_ticker_mismatch(self) -> None:
        session = self.session_factory()
        try:
            session.add(
                DebateStock(id=1, ticker="005930", name="삼성전자", market_type="KOSPI", is_active=True)
            )
            session.commit()

            payload = DebateResultRequest(
                stock_id=1,
                ticker="000660",
                report_date=date(2026, 3, 16),
                debate_version="debate-v1",
            )

            with self.assertRaises(BusinessException) as ctx:
                save_debate_result(session, payload)

            self.assertEqual(ctx.exception.message, "stock_id와 ticker가 일치하지 않습니다.")
        finally:
            session.close()


if __name__ == "__main__":
    unittest.main()
