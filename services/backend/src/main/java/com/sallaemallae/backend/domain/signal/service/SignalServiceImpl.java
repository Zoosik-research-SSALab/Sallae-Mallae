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
  public SignalListResponse getSignals(
      String filter,
      String categories,
      String keyword,
      String marketCap,
      String sort,
      int offset,
      int limit
  ) {
    SignalSupport.SignalQuery query = SignalSupport.SignalQuery.of(filter, categories, keyword, marketCap, sort, offset, limit);
    List<SignalCandidateRow> candidates = signalQueryRepository.findLatestSignalCandidates();

    List<SignalCandidateRow> scopedCandidates = candidates.stream()
        .filter(candidate -> query.matchesCategory(candidate.category()))
        .filter(candidate -> query.matchesKeyword(candidate.name(), candidate.ticker()))
        .filter(candidate -> query.marketCapFilter().matches(candidate.marketCap()))
        .toList();

    int buyCount = (int) scopedCandidates.stream()
        .filter(candidate -> "BUY".equals(candidate.signal()))
        .count();
    int sellCount = (int) scopedCandidates.stream()
        .filter(candidate -> "SELL".equals(candidate.signal()))
        .count();

    List<SignalItemResponse> items = scopedCandidates.stream()
        .filter(candidate -> query.filter().matches(candidate.signal()))
        .sorted(SignalSupport.comparator(query.sort()))
        .skip(query.offset())
        .limit(query.limit())
        .map(candidate -> new SignalItemResponse(
            candidate.stockId(),
            candidate.ticker(),
            candidate.name(),
            candidate.category(),
            candidate.price(),
            candidate.marketCap(),
            candidate.fluctuationRate(),
            candidate.signal(),
            SignalSupport.toPercentInt(candidate.confidence()),
            candidate.createdAt()
        ))
        .toList();

    return new SignalListResponse(buyCount, sellCount, items);
  }
}
