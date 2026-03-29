package com.sallaemallae.backend.domain.signal.service;

import com.sallaemallae.backend.domain.signal.dto.SignalListResponse;

public interface SignalService {

  SignalListResponse getSignals(String filter, String categories, String keyword, String marketCap, String sort, int offset, int limit);
}
