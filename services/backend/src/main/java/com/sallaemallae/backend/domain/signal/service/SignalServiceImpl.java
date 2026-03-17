package com.sallaemallae.backend.domain.signal.service;

import com.sallaemallae.backend.domain.signal.dto.SignalListResponse;
import com.sallaemallae.backend.domain.signal.repository.SignalQueryRepository;
import com.sallaemallae.backend.domain.signal.repository.SignalQueryRepository.SignalCandidateRow;
import com.sallaemallae.backend.domain.signal.dto.SignalItemResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class SignalServiceImpl implements SignalService {

  private final SignalQueryRepository signalQueryRepository;

  @Override
  public SignalListResponse getSignals(String filter, String sort, int offset, int limit) {
    SignalSupport.SignalQuery query = SignalSupport.SignalQuery.of(filter, sort, offset, limit);
    List<SignalCandidateRow> candidates = signalQueryRepository.findLatestSignalCandidates();

    int buyCount = (int) candidates.stream()
        .filter(candidate -> "BUY".equals(candidate.signal()))
        .count();
    int sellCount = (int) candidates.stream()
        .filter(candidate -> "SELL".equals(candidate.signal()))
        .count();

    List<SignalItemResponse> items = candidates.stream()
        .filter(candidate -> query.filter().matches(candidate.signal()))
        .sorted(SignalSupport.comparator(query.sort()))
        .skip(query.offset())
        .limit(query.limit())
        .map(candidate -> new SignalItemResponse(
            candidate.stockId(),
            candidate.ticker(),
            candidate.name(),
            candidate.price(),
            candidate.fluctuationRate(),
            candidate.signal(),
            SignalSupport.toPercentInt(candidate.confidence()),
            candidate.createdAt()
        ))
        .toList();

    return new SignalListResponse(buyCount, sellCount, items);
  }
}
