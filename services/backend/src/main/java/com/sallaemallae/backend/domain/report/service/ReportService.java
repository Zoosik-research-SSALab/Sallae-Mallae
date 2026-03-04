package com.sallaemallae.backend.domain.report.service;

import com.sallaemallae.backend.domain.report.dto.StockReportResponse;

public interface ReportService {

  StockReportResponse getLatestReport(String ticker);
}
