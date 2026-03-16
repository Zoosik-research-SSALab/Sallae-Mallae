package com.sallaemallae.backend.domain.health.service;

import com.sallaemallae.backend.domain.health.dto.KisHealthResponse;

public interface KisHealthService {

  KisHealthResponse check(String sampleTicker);
}
