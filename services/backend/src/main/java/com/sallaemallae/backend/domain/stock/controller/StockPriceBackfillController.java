package com.sallaemallae.backend.domain.stock.controller;

import com.sallaemallae.backend.domain.stock.service.StockPriceBackfillService;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/backfill")
@RequiredArgsConstructor
public class StockPriceBackfillController {

  private final StockPriceBackfillService backfillService;

  @PostMapping("/stocks/{ticker}")
  public ResponseEntity<String> backfillStock(
      @PathVariable String ticker,
      @RequestParam String period,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from
  ) {
    backfillService.backfillStock(ticker, period, from);
    return ResponseEntity.accepted().body("Backfill started for " + ticker + " period=" + period + " from=" + from);
  }

  @PostMapping("/all")
  public ResponseEntity<String> backfillAll(
      @RequestParam String period,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from
  ) {
    backfillService.backfillAll(period, from);
    return ResponseEntity.accepted().body("Full backfill started for period=" + period + " from=" + from);
  }
}
