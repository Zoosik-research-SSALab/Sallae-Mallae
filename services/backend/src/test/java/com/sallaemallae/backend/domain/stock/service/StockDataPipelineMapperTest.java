package com.sallaemallae.backend.domain.stock.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.sallaemallae.backend.domain.stock.dto.StockPeriodPriceResponse;
import com.sallaemallae.backend.domain.stock.dto.StockQuoteResponse;
import com.sallaemallae.backend.domain.stock.dto.StockStoragePreviewResponse;
import com.sallaemallae.backend.infra.kis.cache.CachedResult;
import com.sallaemallae.backend.infra.kis.stock.KisPeriodPriceData;
import com.sallaemallae.backend.infra.kis.stock.KisPriceCandleData;
import com.sallaemallae.backend.infra.kis.stock.KisQuoteData;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

class StockDataPipelineMapperTest {

  private final StockDataPipelineMapper mapper = new StockDataPipelineMapper();

  @Test
  void mapsQuoteAndMinutePreview() {
    OffsetDateTime asOf = OffsetDateTime.of(2026, 3, 12, 10, 15, 0, 0, ZoneOffset.ofHours(9));
    KisQuoteData quoteData = new KisQuoteData(
        "J",
        "005930",
        "Samsung Electronics",
        187400,
        190000,
        -2600,
        -1.37f,
        186600,
        190000,
        185900,
        15254487L,
        asOf,
        "KIS"
    );

    StockQuoteResponse response = mapper.toQuoteResponse(
        new CachedResult<>("KIS:QUOTE:J:005930:V1", true, quoteData),
        "Samsung Electronics"
    );
    StockStoragePreviewResponse preview = mapper.toMinutePreview(1L, "005930", quoteData);

    assertThat(response.ticker()).isEqualTo("005930");
    assertThat(response.cacheHit()).isTrue();
    assertThat(response.cacheKey()).isEqualTo("KIS:QUOTE:J:005930:V1");
    assertThat(preview.targetTable()).isEqualTo("stock_prices_minute");
    assertThat(preview.uniqueKeyColumn()).isEqualTo("trade_timestamp");
    assertThat(preview.stockId()).isEqualTo(1L);
    assertThat(preview.closePrice()).isEqualTo(187400);
    assertThat(preview.volume()).isNull();
  }

  @Test
  void mapsPeriodResponseAndAggregatePreview() {
    KisPriceCandleData first = new KisPriceCandleData(
        LocalDate.of(2026, 3, 12),
        186600,
        190000,
        185900,
        187400,
        15254487L,
        -2600,
        -1.37f,
        false
    );
    KisPriceCandleData second = new KisPriceCandleData(
        LocalDate.of(2026, 3, 11),
        193000,
        194800,
        187700,
        190000,
        24311356L,
        2100,
        1.12f,
        false
    );
    KisPeriodPriceData periodData = new KisPeriodPriceData(
        "J",
        "005930",
        "Samsung Electronics",
        "D",
        LocalDate.of(2026, 3, 1),
        LocalDate.of(2026, 3, 12),
        true,
        187400,
        190000,
        -2600,
        -1.37f,
        186600,
        190000,
        185900,
        15254487L,
        OffsetDateTime.of(2026, 3, 12, 10, 16, 0, 0, ZoneOffset.ofHours(9)),
        List.of(first, second),
        "KIS"
    );

    StockPeriodPriceResponse response = mapper.toPeriodPriceResponse(
        new CachedResult<>("KIS:PERIOD:J:005930:D:2026-03-01:2026-03-12:true:V1", false, periodData),
        "Samsung Electronics"
    );
    List<StockStoragePreviewResponse> previews = mapper.toAggregatePreviews(1L, "005930", "D", periodData.candles());

    assertThat(response.candles()).hasSize(2);
    assertThat(response.cacheHit()).isFalse();
    assertThat(response.candles().get(0).modified()).isFalse();
    assertThat(previews).hasSize(2);
    assertThat(previews.get(0).targetTable()).isEqualTo("stock_prices_daily");
    assertThat(previews.get(0).uniqueKeyColumn()).isEqualTo("trade_date");
    assertThat(previews.get(0).uniqueKeyValue()).isEqualTo("2026-03-12");
  }
}
