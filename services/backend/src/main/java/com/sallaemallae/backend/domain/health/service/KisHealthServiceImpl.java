package com.sallaemallae.backend.domain.health.service;

import com.sallaemallae.backend.domain.health.dto.KisHealthResponse;
import com.sallaemallae.backend.infra.kis.KisApiException;
import com.sallaemallae.backend.infra.kis.KisApprovalKeyManager;
import com.sallaemallae.backend.infra.kis.KisProperties;
import com.sallaemallae.backend.infra.kis.KisTokenManager;
import com.sallaemallae.backend.infra.kis.cache.CachedResult;
import com.sallaemallae.backend.infra.kis.stock.CachedKisDomesticStockGateway;
import com.sallaemallae.backend.infra.kis.stock.KisQuoteData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class KisHealthServiceImpl implements KisHealthService {

  private final KisProperties kisProperties;
  private final KisTokenManager kisTokenManager;
  private final KisApprovalKeyManager kisApprovalKeyManager;
  private final CachedKisDomesticStockGateway cachedGateway;

  @Override
  public KisHealthResponse check(String sampleTicker) {
    String normalizedTicker = sampleTicker == null || sampleTicker.isBlank() ? "005930" : sampleTicker.trim();
    if (!kisProperties.isConfigured()) {
      return new KisHealthResponse(
          false,
          kisProperties.getMode(),
          kisProperties.restBaseUrl(),
          false,
          false,
          normalizedTicker,
          null,
          false,
          null,
          "NOT_CONFIGURED",
          "KIS credentials are not configured."
      );
    }

    try {
      kisTokenManager.getAccessToken();
      kisApprovalKeyManager.getApprovalKey();
      CachedResult<KisQuoteData> quote = cachedGateway.getQuote("J", normalizedTicker);
      return new KisHealthResponse(
          true,
          kisProperties.getMode(),
          kisProperties.restBaseUrl(),
          kisTokenManager.hasValidCachedToken(),
          kisApprovalKeyManager.hasValidCachedApprovalKey(),
          normalizedTicker,
          quote.value().currentPrice(),
          quote.cacheHit(),
          quote.cacheKey(),
          "OK",
          null
      );
    } catch (KisApiException e) {
      return new KisHealthResponse(
          true,
          kisProperties.getMode(),
          kisProperties.restBaseUrl(),
          kisTokenManager.hasValidCachedToken(),
          kisApprovalKeyManager.hasValidCachedApprovalKey(),
          normalizedTicker,
          null,
          false,
          null,
          "ERROR",
          e.getCode() + ": " + e.getMessage()
      );
    }
  }
}
