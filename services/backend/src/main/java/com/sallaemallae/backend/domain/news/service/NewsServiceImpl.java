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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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

  // 뉴스 목록 조회 (키워드 필터, 페이지네이션, 관련 종목명 포함)
  @Override
  public NewsListResponse getNewsList(String keyword, int offset, int limit) {
    Pageable pageable = PageRequest.of(offset / limit, limit);
    // 키워드 유무에 따라 쿼리 분기 (키워드 없으면 JOIN+DISTINCT 생략)
    List<StockNews> rows = (keyword == null || keyword.isBlank())
        ? stockNewsRepository.findAllNews(pageable)
        : stockNewsRepository.findNewsByKeyword(keyword, pageable);
    List<Long> newsIds = rows.stream().map(StockNews::getId).toList();
    Map<Long, List<String>> stockMap = buildStockNameMap(newsIds);

    List<NewsListItemResponse> news = rows.stream()
        .map(sn -> new NewsListItemResponse(
            sn.getId(),
            sn.getTitle(),
            sn.getPublisher(),
            sn.getPublishedAt(),
            stockMap.getOrDefault(sn.getId(), List.of())))
        .toList();

    return new NewsListResponse(news);
  }

  // 뉴스 상세 조회 (관련 종목 포함, 조회 시 키워드 Redis 트렌딩 점수 증가)
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

  // Redis Sorted Set에서 오늘 기준 상위 5개 트렌딩 키워드 조회
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

  // 뉴스에 매핑된 키워드를 Redis Sorted Set에 ZINCRBY +1 (하루 TTL)
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

  // 뉴스 ID 목록으로 관련 종목명을 일괄 조회하여 Map으로 반환 (N+1 방지)
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

}
