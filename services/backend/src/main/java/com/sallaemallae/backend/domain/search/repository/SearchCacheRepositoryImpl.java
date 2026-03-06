package com.sallaemallae.backend.domain.search.repository;

import com.sallaemallae.backend.domain.search.dto.SearchRecentItemResponse;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations.TypedTuple;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class SearchCacheRepositoryImpl implements SearchCacheRepository {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");
  private static final String SEARCH_HISTORY_KEY_PREFIX = "SEARCH_HISTORY:";
  private static final String SEARCH_HISTORY_META_KEY_PREFIX = "SEARCH_HISTORY_META:";

  private final StringRedisTemplate stringRedisTemplate;

  @Override
  public List<SearchRecentItemResponse> getRecent(Long userId, int limit) {
    String historyKey = historyKey(userId);
    String metaKey = metaKey(userId);
    Set<TypedTuple<String>> tuples = stringRedisTemplate.opsForZSet()
        .reverseRangeWithScores(historyKey, 0, limit - 1);

    if (tuples == null || tuples.isEmpty()) {
      return List.of();
    }

    List<SearchRecentItemResponse> recent = new ArrayList<>();
    for (TypedTuple<String> tuple : tuples) {
      String keyword = tuple.getValue();
      Double score = tuple.getScore();
      if (keyword == null || score == null) {
        continue;
      }

      String stockIdValue = (String) stringRedisTemplate.opsForHash().get(metaKey, keyword);
      Long stockId = parseLong(stockIdValue);
      OffsetDateTime searchedAt = OffsetDateTime.ofInstant(
          Instant.ofEpochMilli(score.longValue()),
          ZONE_ID
      );
      recent.add(new SearchRecentItemResponse(keyword, searchedAt, stockId));
    }
    return recent;
  }

  @Override
  public void saveRecent(Long userId, String keyword, Long stockId, int limit) {
    String historyKey = historyKey(userId);
    String metaKey = metaKey(userId);
    long now = System.currentTimeMillis();

    stringRedisTemplate.opsForZSet().add(historyKey, keyword, now);
    stringRedisTemplate.opsForHash().put(metaKey, keyword, String.valueOf(stockId));

    Long size = stringRedisTemplate.opsForZSet().zCard(historyKey);
    if (size == null || size <= limit) {
      return;
    }

    long removeCount = size - limit;
    Set<String> removedKeywords = stringRedisTemplate.opsForZSet()
        .range(historyKey, 0, removeCount - 1);
    if (removedKeywords == null || removedKeywords.isEmpty()) {
      return;
    }

    Object[] removed = removedKeywords.toArray();
    stringRedisTemplate.opsForZSet().remove(historyKey, removed);
    stringRedisTemplate.opsForHash().delete(metaKey, removed);
  }

  @Override
  public void deleteRecent(Long userId, String keyword) {
    String historyKey = historyKey(userId);
    String metaKey = metaKey(userId);
    stringRedisTemplate.opsForZSet().remove(historyKey, keyword);
    stringRedisTemplate.opsForHash().delete(metaKey, keyword);
  }

  @Override
  public void clearRecent(Long userId) {
    stringRedisTemplate.delete(historyKey(userId));
    stringRedisTemplate.delete(metaKey(userId));
  }

  private String historyKey(Long userId) {
    return SEARCH_HISTORY_KEY_PREFIX + userId;
  }

  private String metaKey(Long userId) {
    return SEARCH_HISTORY_META_KEY_PREFIX + userId;
  }

  private Long parseLong(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      return Long.parseLong(value);
    } catch (NumberFormatException ignored) {
      return null;
    }
  }
}
