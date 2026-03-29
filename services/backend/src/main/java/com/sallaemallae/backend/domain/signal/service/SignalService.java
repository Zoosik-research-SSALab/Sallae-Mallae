package com.sallaemallae.backend.domain.signal.service;

import com.sallaemallae.backend.domain.signal.dto.SignalItemResponse;
import java.util.List;

public interface SignalService {

  List<SignalItemResponse> getSignals(Long cursor, int size);
}
