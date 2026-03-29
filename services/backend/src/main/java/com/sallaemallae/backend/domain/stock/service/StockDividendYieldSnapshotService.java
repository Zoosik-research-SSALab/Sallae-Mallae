package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockDividendYieldSnapshot;
import com.sallaemallae.backend.domain.stock.repository.StockDividendYieldSnapshotRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.infra.kis.KisApiException;
import com.sallaemallae.backend.infra.kis.KisProperties;
import com.sallaemallae.backend.infra.kis.cache.DividendYieldSnapshotRepository;
import com.sallaemallae.backend.infra.kis.cache.DividendYieldSnapshotRepository.DividendYieldSnapshot;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheTtlPolicy;
import com.sallaemallae.backend.infra.kis.stock.KisDividendRateData;
import com.sallaemallae.backend.infra.kis.stock.KisDividendRateItem;
import com.sallaemallae.backend.infra.kis.stock.KisDomesticStockClient;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockDividendYieldSnapshotService {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");
  private static final int LOOKBACK_DAYS = 400;
  private static final String KOSPI_MARKET_GROUP = "1";
  private static final String KOSDAQ_MARKET_GROUP = "3";
  private static final String KOSPI_UPJONG = "0001";
  private static final String KOSDAQ_UPJONG = "1001";
  private static final String SNAPSHOT_SOURCE = "KIS dividend-rate";

  private final KisProperties kisProperties;
  private final KisDomesticStockClient kisDomesticStockClient;
  private final DividendYieldSnapshotRepository redisSnapshotRepository;
  private final StockDividendYieldSnapshotRepository stockDividendYieldSnapshotRepository;
  private final StockRepository stockRepository;
  private final MarketCacheTtlPolicy ttlPolicy;

  @Transactional(readOnly = true)
  public Map<String, Float> getDividendYieldMap() {
    try {
      return redisSnapshotRepository.getSnapshot()
          .map(DividendYieldSnapshot::yields)
          .filter(snapshot -> snapshot != null && !snapshot.isEmpty())
          .map(Map::copyOf)
          .orElseGet(Map::of);
    } catch (RuntimeException e) {
      log.warn("Failed to load dividend yield snapshot.", e);
      return Map.of();
    }
  }

  @Transactional(readOnly = true)
  public Map<Long, Float> getLatestDividendYieldByStockIds(Collection<Long> stockIds) {
    if (stockIds == null || stockIds.isEmpty()) {
      return Map.of();
    }

    try {
      List<StockDividendYieldSnapshot> snapshots = stockDividendYieldSnapshotRepository
          .findAllByStockIdInAndIsLatestTrue(stockIds);
      if (snapshots == null || snapshots.isEmpty()) {
        return Map.of();
      }

      Map<Long, Float> yieldByStockId = new HashMap<>();
      for (StockDividendYieldSnapshot snapshot : snapshots) {
        if (snapshot == null || snapshot.getStockId() == null || snapshot.cashDividendYieldValue() == null) {
          continue;
        }
        yieldByStockId.put(snapshot.getStockId(), snapshot.cashDividendYieldValue());
      }
      return Map.copyOf(yieldByStockId);
    } catch (RuntimeException e) {
      log.warn("Failed to load latest dividend yield snapshots from DB.", e);
      return Map.of();
    }
  }

  @Scheduled(
      initialDelayString = "${stock.dividend.snapshot.refresh-initial-delay-millis:30000}",
      fixedDelayString = "${stock.dividend.snapshot.refresh-fixed-delay-millis:43200000}"
  )
  @Transactional
  public void refreshSnapshotOnSchedule() {
    refreshSnapshot();
  }

  @Transactional
  public void refreshSnapshot() {
    if (!kisProperties.isConfigured()) {
      log.debug("Skipping dividend yield snapshot refresh because KIS credentials are not configured.");
      return;
    }

    LocalDate toDate = LocalDate.now(ZONE_ID);
    LocalDate fromDate = toDate.minusDays(LOOKBACK_DAYS);

    List<KisDividendRateItem> sourceItems;
    Map<String, KisDividendRateItem> latestItemsByTicker;
    Map<String, Float> yieldByTicker;

    try {
      sourceItems = new ArrayList<>();
      sourceItems.addAll(fetchMarket(KOSPI_MARKET_GROUP, KOSPI_UPJONG, fromDate, toDate));
      sourceItems.addAll(fetchMarket(KOSDAQ_MARKET_GROUP, KOSDAQ_UPJONG, fromDate, toDate));

      latestItemsByTicker = buildLatestItemsByTicker(sourceItems);
      yieldByTicker = toYieldMap(latestItemsByTicker);
      if (yieldByTicker.isEmpty()) {
        log.warn("Skipping dividend yield snapshot refresh because KIS returned no usable items.");
        return;
      }

      persistLatestSnapshots(latestItemsByTicker, fromDate, toDate);
    } catch (KisApiException e) {
      markRollbackOnlyIfActive();
      log.warn("Failed to refresh dividend yield snapshot from KIS. code={}", e.getCode(), e);
      return;
    } catch (RuntimeException e) {
      markRollbackOnlyIfActive();
      log.warn("Failed to refresh dividend yield snapshot.", e);
      return;
    }

    DividendYieldSnapshot snapshot = new DividendYieldSnapshot(
        OffsetDateTime.now(ZONE_ID),
        fromDate,
        toDate,
        sourceItems.size(),
        yieldByTicker,
        SNAPSHOT_SOURCE
    );
    runAfterCommitOrNow(() -> {
      redisSnapshotRepository.saveSnapshot(snapshot, ttlPolicy.dividendYieldSnapshotTtl());
      log.info(
          "Dividend yield snapshot refreshed. tickers={}, sourceItems={}, fromDate={}, toDate={}",
          yieldByTicker.size(),
          sourceItems.size(),
          fromDate,
          toDate
      );
    });
  }

  private List<KisDividendRateItem> fetchMarket(
      String marketGroup,
      String upjong,
      LocalDate fromDate,
      LocalDate toDate
  ) {
    KisDividendRateData response = kisDomesticStockClient.getCashDividendRateRanking(
        marketGroup,
        upjong,
        fromDate,
        toDate
    );
    return response.items();
  }

  private Map<String, KisDividendRateItem> buildLatestItemsByTicker(List<KisDividendRateItem> items) {
    Map<String, KisDividendRateItem> latestByTicker = new HashMap<>();
    for (KisDividendRateItem item : items) {
      if (item == null || item.ticker() == null || item.ticker().isBlank() || item.dividendYield() == null) {
        continue;
      }
      latestByTicker.merge(item.ticker(), item, this::preferLatestItem);
    }
    return Map.copyOf(latestByTicker);
  }

  private Map<String, Float> toYieldMap(Map<String, KisDividendRateItem> latestItemsByTicker) {
    Map<String, Float> yieldByTicker = new HashMap<>();
    for (KisDividendRateItem item : latestItemsByTicker.values()) {
      if (!item.isCashDividend()) {
        continue;
      }
      yieldByTicker.put(item.ticker(), item.dividendYield());
    }
    return Map.copyOf(yieldByTicker);
  }

  private void persistLatestSnapshots(
      Map<String, KisDividendRateItem> latestItemsByTicker,
      LocalDate fromDate,
      LocalDate toDate
  ) {
    List<String> tickers = latestItemsByTicker.keySet().stream().toList();
    if (tickers.isEmpty()) {
      return;
    }

    List<Stock> matchedStocks = stockRepository.findAllByTickerInAndIsActiveTrue(tickers);
    if (matchedStocks == null || matchedStocks.isEmpty()) {
      log.warn("Skipping dividend yield DB sync because no active stocks matched snapshot tickers.");
      return;
    }

    List<Long> stockIds = matchedStocks.stream()
        .map(Stock::getId)
        .filter(Objects::nonNull)
        .toList();
    if (stockIds.isEmpty()) {
      return;
    }

    Map<Long, StockDividendYieldSnapshot> latestByStockId = stockDividendYieldSnapshotRepository
        .findAllByStockIdInAndIsLatestTrue(stockIds)
        .stream()
        .collect(Collectors.toMap(StockDividendYieldSnapshot::getStockId, Function.identity(), (left, right) -> left));

    Map<Long, StockDividendYieldSnapshot> sameDayByStockId = stockDividendYieldSnapshotRepository
        .findAllByStockIdInAndAsOfDateAndSource(stockIds, toDate, SNAPSHOT_SOURCE)
        .stream()
        .collect(Collectors.toMap(StockDividendYieldSnapshot::getStockId, Function.identity(), (left, right) -> left));

    latestByStockId.values().forEach(StockDividendYieldSnapshot::markNotLatest);

    List<StockDividendYieldSnapshot> snapshotsToSave = new ArrayList<>();
    OffsetDateTime fetchedAt = OffsetDateTime.now(ZONE_ID);
    for (Stock stock : matchedStocks) {
      KisDividendRateItem item = latestItemsByTicker.get(stock.getTicker());
      if (item == null || item.dividendYield() == null) {
        continue;
      }

      Float cashDividendYield = item.isCashDividend() ? item.dividendYield() : null;
      Float stockDividendYield = item.isStockDividend() ? item.dividendYield() : null;

      StockDividendYieldSnapshot snapshot = sameDayByStockId.get(stock.getId());
      if (snapshot == null) {
        snapshot = StockDividendYieldSnapshot.create(
            stock.getId(),
            toDate,
            item.recordDate(),
            cashDividendYield,
            stockDividendYield,
            item.dividendKind(),
            SNAPSHOT_SOURCE,
            fromDate,
            toDate,
            fetchedAt,
            true
        );
      } else {
        snapshot.applySnapshot(
            item.recordDate(),
            cashDividendYield,
            stockDividendYield,
            item.dividendKind(),
            fromDate,
            toDate,
            fetchedAt,
            true
        );
      }
      snapshotsToSave.add(snapshot);
    }

    if (!snapshotsToSave.isEmpty()) {
      stockDividendYieldSnapshotRepository.saveAllAndFlush(snapshotsToSave);
    }
  }

  private KisDividendRateItem preferLatestItem(KisDividendRateItem current, KisDividendRateItem candidate) {
    if (candidate.recordDate() != null && current.recordDate() != null) {
      int dateComparison = candidate.recordDate().compareTo(current.recordDate());
      if (dateComparison != 0) {
        return dateComparison > 0 ? candidate : current;
      }
    } else if (candidate.recordDate() != null) {
      return candidate;
    } else if (current.recordDate() == null && candidate.rank() != null && current.rank() == null) {
      return candidate;
    }

    if (candidate.isCashDividend() != current.isCashDividend()) {
      return candidate.isCashDividend() ? candidate : current;
    }

    if (candidate.rank() != null && current.rank() != null) {
      return candidate.rank() < current.rank() ? candidate : current;
    }
    return candidate.rank() != null ? candidate : current;
  }

  private void runAfterCommitOrNow(Runnable task) {
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      task.run();
      return;
    }

    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
      @Override
      public void afterCommit() {
        task.run();
      }
    });
  }

  private void markRollbackOnlyIfActive() {
    if (!TransactionSynchronizationManager.isActualTransactionActive()) {
      return;
    }
    TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
  }
}
