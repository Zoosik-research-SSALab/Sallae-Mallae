package com.sallaemallae.backend.domain.main.service;

import com.sallaemallae.backend.domain.main.dto.MainSummaryResponse;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MainServiceImpl implements MainService {

  @Override
  public MainSummaryResponse getMainSummary() {
    return new MainSummaryResponse(
        List.of("005930", "000660", "035420"),
        List.of("BUY:005930", "HOLD:035420"),
        "OPEN"
    );
  }
}
