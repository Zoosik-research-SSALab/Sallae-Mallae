package com.sallaemallae.backend.domain.user.service;

import com.sallaemallae.backend.domain.auth.entity.PasswordHistory;
import com.sallaemallae.backend.domain.auth.entity.User;
import com.sallaemallae.backend.domain.auth.exception.AuthErrorCode;
import com.sallaemallae.backend.domain.auth.repository.PasswordHistoryRepository;
import com.sallaemallae.backend.domain.auth.repository.UserRepository;
import com.sallaemallae.backend.domain.auth.service.PasswordValidator;
import com.sallaemallae.backend.domain.signal.repository.SignalQueryRepository;
import com.sallaemallae.backend.domain.signal.repository.SignalQueryRepository.SignalCandidateRow;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.service.StockQuoteCacheService;
import com.sallaemallae.backend.infra.kis.stock.KisQuoteData;
import com.sallaemallae.backend.domain.user.dto.request.UserEmailOptInRequest;
import com.sallaemallae.backend.domain.user.dto.request.UserPasswordUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.request.UserProfileUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistAddResponse;
import com.sallaemallae.backend.domain.user.dto.request.WatchlistAlertToggleRequest;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistAlertToggleResponse;
import com.sallaemallae.backend.domain.user.dto.request.WatchlistCreateRequest;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistItemResponse;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistListResponse;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistRemoveResponse;
import com.sallaemallae.backend.domain.user.dto.response.WatchlistStatusResponse;
import com.sallaemallae.backend.domain.user.entity.UserWatchlist;
import com.sallaemallae.backend.domain.user.entity.UserWatchlistId;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.domain.storage.exception.StorageErrorCode;
import com.sallaemallae.backend.domain.storage.service.FileStorageService;
import com.sallaemallae.backend.domain.user.exception.UserErrorCode;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.global.exception.GlobalErrorCode;
import com.sallaemallae.backend.global.security.jwt.RedisTokenService;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

  private final UserRepository userRepository;
  private final PasswordHistoryRepository passwordHistoryRepository;
  private final PasswordValidator passwordValidator;
  private final PasswordEncoder passwordEncoder;
  private final RedisTokenService redisTokenService;
  private final WatchlistRepository watchlistRepository;
  private final StockRepository stockRepository;
  private final FileStorageService fileStorageService;
  private final StockQuoteCacheService stockQuoteCacheService;
  private final SignalQueryRepository signalQueryRepository;

  private static final int WATCHLIST_MAX_SIZE = 50;

  @Override
  @Transactional(readOnly = true)
  public WatchlistListResponse getWatchlist(Long userId) {
    List<UserWatchlist> watchlistItems = watchlistRepository.findAllByIdUserId(userId);

    if (watchlistItems.isEmpty()) {
      return new WatchlistListResponse(0, 0, 0, 0, List.of());
    }

    List<Long> stockIds = watchlistItems.stream()
        .map(item -> item.getId().getStockId())
        .toList();

    Map<Long, Stock> stockMap = stockRepository.findAllById(stockIds).stream()
        .collect(Collectors.toMap(Stock::getId, Function.identity()));

    // Redis 캐시에서 가격 조회 (ticker → KisQuoteData)
    List<String> tickers = stockIds.stream()
        .filter(stockMap::containsKey)
        .map(id -> stockMap.get(id).getTicker())
        .toList();
    Map<String, KisQuoteData> quoteMap = stockQuoteCacheService.getAll("J", tickers);

    // AI 시그널 조회 (stockId → SignalCandidateRow) — 관심종목 전용 (HOLD/STAY 포함)
    Map<Long, SignalCandidateRow> signalMap = signalQueryRepository.findLatestSignalsForStocks(stockIds)
        .stream()
        .collect(Collectors.toMap(SignalCandidateRow::stockId, Function.identity(), (a, b) -> a));

    List<WatchlistItemResponse> items = watchlistItems.stream()
        .filter(item -> stockMap.containsKey(item.getId().getStockId()))
        .map(item -> {
          Long stockId = item.getId().getStockId();
          Stock stock = stockMap.get(stockId);

          // 가격 정보: Redis 캐시 우선
          KisQuoteData quote = quoteMap.get(stock.getTicker());
          Integer price = quote != null ? quote.currentPrice() : null;
          Float fluctuationRate = quote != null ? quote.changeRate() : null;

          // AI 시그널 정보
          SignalCandidateRow signal = signalMap.get(stockId);
          String signalType = signal != null ? signal.signal() : null;
          Integer confidence = signal != null && signal.confidence() != null
              ? Math.round(signal.confidence() * 100) : null;

          // 가격 fallback: 시그널 쿼리에 포함된 일봉 종가
          if (price == null && signal != null && signal.price() != null) {
            price = signal.price();
            fluctuationRate = signal.fluctuationRate();
          }

          return new WatchlistItemResponse(
              stockId,
              stock.getTicker(),
              stock.getName(),
              item.isNotiEnabled(),
              price,
              fluctuationRate,
              signalType,
              confidence,
              item.getCreatedAt()
          );
        })
        .toList();

    long buyCount = items.stream().filter(i -> "BUY".equals(i.signal())).count();
    long sellCount = items.stream().filter(i -> "SELL".equals(i.signal())).count();
    long upCount = items.stream()
        .filter(i -> i.fluctuationRate() != null && i.fluctuationRate() > 0)
        .count();

    return new WatchlistListResponse(items.size(), buyCount, sellCount, upCount, items);
  }

  @Override
  @Transactional(readOnly = true)
  public WatchlistStatusResponse getWatchlistStatus(Long userId, Long stockId) {
    return watchlistRepository.findById(new UserWatchlistId(userId, stockId))
        .map(watchlist -> new WatchlistStatusResponse(true, watchlist.isNotiEnabled()))
        .orElse(new WatchlistStatusResponse(false, false));
  }

  @Override
  @Transactional
  public WatchlistAddResponse addWatchlist(Long userId, WatchlistCreateRequest request) {
    stockRepository.findById(request.stockId())
        .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_NOT_FOUND));

    long currentCount = watchlistRepository.countByUserIdForUpdate(userId);
    if (currentCount >= WATCHLIST_MAX_SIZE) {
      throw new BusinessException(UserErrorCode.WATCHLIST_LIMIT_EXCEEDED);
    }

    try {
      watchlistRepository.save(UserWatchlist.create(userId, request.stockId()));
    } catch (org.springframework.dao.DataIntegrityViolationException e) {
      throw new BusinessException(UserErrorCode.WATCHLIST_ALREADY_EXISTS);
    }

    return new WatchlistAddResponse("관심종목 추가 완료", currentCount + 1);
  }

  @Override
  @Transactional
  public WatchlistRemoveResponse removeWatchlist(Long userId, Long stockId) {
    UserWatchlistId watchlistId = new UserWatchlistId(userId, stockId);
    if (!watchlistRepository.existsById(watchlistId)) {
      throw new BusinessException(UserErrorCode.WATCHLIST_NOT_FOUND);
    }

    watchlistRepository.deleteById(watchlistId);

    return new WatchlistRemoveResponse("관심종목 제거 완료");
  }

  @Override
  @Transactional
  public WatchlistAlertToggleResponse toggleWatchlistAlert(Long userId, Long stockId, WatchlistAlertToggleRequest request) {
    UserWatchlist watchlist = watchlistRepository.findById(new UserWatchlistId(userId, stockId))
        .orElseThrow(() -> new BusinessException(UserErrorCode.WATCHLIST_NOT_FOUND));

    watchlist.toggleNoti(request.isNotiEnabled());

    return new WatchlistAlertToggleResponse(watchlist.isNotiEnabled());
  }

  @Override
  @Transactional(readOnly = true)
  public List<Map<String, Object>> getWatchlistNews(Long userId) {
    return List.of(Map.of("userId", userId, "message", "watchlist news boilerplate"));
  }

  @Override
  @Transactional
  public Map<String, Object> updateProfile(Long userId, UserProfileUpdateRequest request) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

    String oldImageUrl = user.getProfileImageUrl();
    String newImageUrl = request.profileImageUrl();

    if (newImageUrl != null
        && fileStorageService.isMinioUrl(newImageUrl)
        && !fileStorageService.verifyObjectExists(newImageUrl)) {
      throw new BusinessException(StorageErrorCode.UPLOAD_NOT_VERIFIED);
    }

    user.updateProfile(request.nickname(), newImageUrl);

    if (!Objects.equals(oldImageUrl, newImageUrl) && fileStorageService.isMinioUrl(oldImageUrl)) {
      TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
        @Override
        public void afterCommit() {
          fileStorageService.deleteObject(oldImageUrl);
        }
      });
    }

    return Map.of("message", "프로필이 수정되었습니다.");
  }

  @Override
  @Transactional
  public Map<String, Object> updatePassword(Long userId, UserPasswordUpdateRequest request) {
    // 1. 사용자 조회
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new BusinessException(GlobalErrorCode.NOT_FOUND));

    // 2. 소셜 로그인 계정 체크
    if (user.getPasswordHash() == null) {
      throw new BusinessException(AuthErrorCode.PWD_SOCIAL_ACCOUNT);
    }

    // 3. 현재 비밀번호 확인 (BCrypt 비교)
    if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
      throw new BusinessException(AuthErrorCode.PWD_WRONG_CURRENT);
    }

    // 4. 비밀번호 정책 검증
    PasswordValidator.ValidationResult validationResult =
        passwordValidator.validate(request.newPassword(), user.getEmail());
    if (!validationResult.valid()) {
      throw new BusinessException(AuthErrorCode.PWD_POLICY_VIOLATION);
    }

    // 5. 최근 3개 비밀번호 재사용 확인 (BCrypt 비교)
    List<PasswordHistory> recentPasswords =
        passwordHistoryRepository.findRecentByUserId(userId, 3);
    for (PasswordHistory ph : recentPasswords) {
      if (passwordEncoder.matches(request.newPassword(), ph.getPasswordHash())) {
        throw new BusinessException(AuthErrorCode.PWD_RECENT_REUSE);
      }
    }

    // 6. 비밀번호 해시 및 변경
    String hashedPassword = passwordEncoder.encode(request.newPassword());
    user.changePassword(hashedPassword);

    // 7. 토큰 버전 증가 (기존 모든 AT 무효화)
    user.incrementTokenVersion();

    // 8. 모든 Refresh Token 삭제
    redisTokenService.deleteAllRefreshTokens(userId);

    // 9. 비밀번호 이력 저장
    passwordHistoryRepository.save(
        PasswordHistory.changedByUser(userId, hashedPassword, null)
    );

    return Map.of("message", "비밀번호가 변경되었습니다.");
  }

  @Override
  @Transactional
  public Map<String, Object> updateEmailOptIn(Long userId, UserEmailOptInRequest request) {
    return Map.of("userId", userId, "emailOptIn", request.emailOptIn());
  }

  @Override
  @Transactional
  public Map<String, Object> deleteProfile(Long userId) {
    return Map.of("userId", userId, "message", "delete profile boilerplate");
  }

}
