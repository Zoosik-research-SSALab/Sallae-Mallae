package com.sallaemallae.backend.domain.report.service;

import com.sallaemallae.backend.domain.report.dto.StockReportResponse;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

  @Override
  public StockReportResponse getLatestReport(String ticker) {
    return new StockReportResponse(ticker, "HOLD", 0.50f, OffsetDateTime.now());
  }
}
