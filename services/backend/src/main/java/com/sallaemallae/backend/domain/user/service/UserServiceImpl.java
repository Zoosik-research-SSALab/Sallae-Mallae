package com.sallaemallae.backend.domain.user.service;

import com.sallaemallae.backend.domain.auth.entity.PasswordHistory;
import com.sallaemallae.backend.domain.auth.entity.User;
import com.sallaemallae.backend.domain.auth.exception.AuthErrorCode;
import com.sallaemallae.backend.domain.auth.repository.PasswordHistoryRepository;
import com.sallaemallae.backend.domain.auth.repository.UserRepository;
import com.sallaemallae.backend.domain.auth.service.PasswordValidator;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.user.dto.UserEmailOptInRequest;
import com.sallaemallae.backend.domain.user.dto.UserPasswordUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.UserProfileUpdateRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistAddResponse;
import com.sallaemallae.backend.domain.user.dto.WatchlistAlertToggleRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistCreateRequest;
import com.sallaemallae.backend.domain.user.dto.WatchlistItemResponse;
import com.sallaemallae.backend.domain.user.dto.WatchlistListResponse;
import com.sallaemallae.backend.domain.user.dto.WatchlistRemoveResponse;
import com.sallaemallae.backend.domain.user.entity.UserWatchlist;
import com.sallaemallae.backend.domain.user.entity.UserWatchlistId;
import com.sallaemallae.backend.domain.user.exception.UserErrorCode;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.global.exception.GlobalErrorCode;
import com.sallaemallae.backend.global.security.jwt.RedisTokenService;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

  private static final int WATCHLIST_MAX_SIZE = 50;

  @Override
  @Transactional(readOnly = true)
  public WatchlistListResponse getWatchlist(Long userId) {
    List<UserWatchlist> watchlistItems = watchlistRepository.findAllByIdUserId(userId);

    if (watchlistItems.isEmpty()) {
      return new WatchlistListResponse(0, List.of());
    }

    List<Long> stockIds = watchlistItems.stream()
        .map(item -> item.getId().getStockId())
        .toList();

    Map<Long, Stock> stockMap = stockRepository.findAllById(stockIds).stream()
        .collect(Collectors.toMap(Stock::getId, Function.identity()));

    List<WatchlistItemResponse> items = watchlistItems.stream()
        .map(item -> {
          Stock stock = stockMap.get(item.getId().getStockId());
          return new WatchlistItemResponse(
              item.getId().getStockId(),
              stock != null ? stock.getTicker() : null,
              stock != null ? stock.getName() : null,
              item.isNotiEnabled(),
              item.getCreatedAt()
          );
        })
        .toList();

    return new WatchlistListResponse(items.size(), items);
  }

  @Override
  @Transactional(readOnly = true)
  public Map<String, Object> getWatchlistStatus(Long userId, Long stockId) {
    return Map.of("userId", userId, "stockId", stockId, "scraped", false, "alarmOn", true);
  }

  @Override
  @Transactional
  public WatchlistAddResponse addWatchlist(Long userId, WatchlistCreateRequest request) {
    stockRepository.findById(request.stockId())
        .orElseThrow(() -> new BusinessException(UserErrorCode.STOCK_NOT_FOUND));

    UserWatchlistId watchlistId = new UserWatchlistId(userId, request.stockId());
    if (watchlistRepository.existsById(watchlistId)) {
      throw new BusinessException(UserErrorCode.WATCHLIST_ALREADY_EXISTS);
    }

    long currentCount = watchlistRepository.countByIdUserId(userId);
    if (currentCount >= WATCHLIST_MAX_SIZE) {
      throw new BusinessException(UserErrorCode.WATCHLIST_LIMIT_EXCEEDED);
    }

    watchlistRepository.save(UserWatchlist.create(userId, request.stockId()));

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
  public Map<String, Object> toggleWatchlistAlert(Long userId, Long stockId, WatchlistAlertToggleRequest request) {
    return Map.of("userId", userId, "stockId", stockId, "alarmOn", request.alarmOn());
  }

  @Override
  @Transactional(readOnly = true)
  public List<Map<String, Object>> getWatchlistNews(Long userId) {
    return List.of(Map.of("userId", userId, "message", "watchlist news boilerplate"));
  }

  @Override
  @Transactional
  public Map<String, Object> updateProfile(Long userId, UserProfileUpdateRequest request) {
    return Map.of("userId", userId, "nickname", request.nickname(), "profileImageUrl", request.profileImageUrl());
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
