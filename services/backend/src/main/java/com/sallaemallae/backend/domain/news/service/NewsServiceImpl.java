package com.sallaemallae.backend.domain.news.service;

import com.sallaemallae.backend.domain.news.dto.NewsDetailResponse;
import com.sallaemallae.backend.domain.news.dto.NewsDetailResponse.RelatedStock;
import com.sallaemallae.backend.domain.news.dto.NewsListItemResponse;
import com.sallaemallae.backend.domain.news.dto.NewsListResponse;
import com.sallaemallae.backend.domain.news.dto.TrendingKeywordsResponse;
import com.sallaemallae.backend.domain.news.dto.TrendingKeywordsResponse.TrendingItem;
import com.sallaemallae.backend.domain.news.entity.StockNews;
import com.sallaemallae.backend.domain.news.exception.NewsErrorCode;
import com.sallaemallae.backend.domain.news.repository.KeywordRepository;
import com.sallaemallae.backend.domain.news.repository.StockNewsRepository;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations.TypedTuple;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class NewsServiceImpl implements NewsService {

  private final StockNewsRepository stockNewsRepository;
  private final KeywordRepository keywordRepository;
  private final StringRedisTemplate redisTemplate;

  private static final String TRENDING_KEY_PREFIX = "trending:keywords:";

  @Override
  public NewsListResponse getNewsList(String keyword, int offset, int limit) {
    List<Object[]> rows = stockNewsRepository.findNewsWithOptionalKeyword(keyword, limit, offset);
    List<Long> newsIds = rows.stream().map(r -> toLong(r[0])).toList();
    Map<Long, List<String>> stockMap = buildStockNameMap(newsIds);

    List<NewsListItemResponse> news = rows.stream()
        .map(r -> new NewsListItemResponse(
            toLong(r[0]),
            (String) r[1],
            (String) r[2],
            toOffsetDateTime(r[3]),
            stockMap.getOrDefault(toLong(r[0]), List.of())))
        .toList();

    return new NewsListResponse(news);
  }

  @Override
  public NewsDetailResponse getNewsDetail(Long newsId) {
    StockNews news = stockNewsRepository.findById(newsId)
        .orElseThrow(() -> new BusinessException(NewsErrorCode.NEWS_NOT_FOUND));

    List<RelatedStock> relatedStocks = stockNewsRepository.findRelatedStocksByNewsId(newsId)
        .stream()
        .map(r -> new RelatedStock(toLong(r[0]), (String) r[1], (String) r[2]))
        .toList();

    incrementKeywords(newsId);

    return new NewsDetailResponse(
        news.getId(),
        news.getTitle(),
        news.getSnippet(),
        news.getPublisher(),
        news.getPublishedAt(),
        news.getUrl(),
        relatedStocks);
  }

  @Override
  public TrendingKeywordsResponse getTrendingKeywords() {
    String key = TRENDING_KEY_PREFIX + LocalDate.now();
    Set<TypedTuple<String>> top = redisTemplate.opsForZSet()
        .reverseRangeWithScores(key, 0, 4);

    List<TrendingItem> trending = new ArrayList<>();
    if (top != null) {
      int rank = 1;
      for (TypedTuple<String> tuple : top) {
        trending.add(new TrendingItem(rank++, tuple.getValue()));
      }
    }
    return new TrendingKeywordsResponse(trending);
  }

  private void incrementKeywords(Long newsId) {
    List<String> keywords = keywordRepository.findKeywordNamesByNewsId(newsId);
    if (keywords.isEmpty()) {
      return;
    }
    String key = TRENDING_KEY_PREFIX + LocalDate.now();
    for (String keyword : keywords) {
      redisTemplate.opsForZSet().incrementScore(key, keyword, 1);
    }
    redisTemplate.expire(key, 1, TimeUnit.DAYS);
  }

  private Map<Long, List<String>> buildStockNameMap(List<Long> newsIds) {
    Map<Long, List<String>> stockMap = new HashMap<>();
    if (newsIds.isEmpty()) {
      return stockMap;
    }
    stockNewsRepository.findStockNamesByNewsIds(newsIds).forEach(r ->
        stockMap.computeIfAbsent(toLong(r[0]), k -> new ArrayList<>()).add((String) r[1]));
    return stockMap;
  }

  private Long toLong(Object obj) {
    if (obj instanceof Number n) return n.longValue();
    return null;
  }

  private OffsetDateTime toOffsetDateTime(Object obj) {
    if (obj instanceof OffsetDateTime odt) return odt;
    if (obj instanceof java.sql.Timestamp ts) return ts.toInstant().atOffset(ZoneOffset.UTC);
    return null;
  }
}
