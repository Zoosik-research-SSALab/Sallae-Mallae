package com.sallaemallae.backend.domain.signal.service;

import com.sallaemallae.backend.domain.signal.dto.SignalItemResponse;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class SignalServiceImpl implements SignalService {

  @Override
  public List<SignalItemResponse> getSignals(Long cursor, int size) {
    return List.of(new SignalItemResponse(1L, "005930", "BUY", 0.71f));
  }
}
