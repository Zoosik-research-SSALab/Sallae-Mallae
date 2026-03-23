package com.sallaemallae.backend.domain.stock.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.sallaemallae.backend.domain.news.entity.StockNews;

/**
 * 종목 상세 페이지에서 사용하는 뉴스 조회 쿼리 (stock 도메인 소속)
 */
public interface StockNewsQueryRepository extends JpaRepository<StockNews, Long> {

  interface StockNewsSummaryProjection {

    Long getId();

    String getTitle();

    String getPublisher();

    java.time.OffsetDateTime getPublishedAt();
  }

  @Query(value = """
      SELECT DISTINCT sn.id AS id,
             sn.title AS title,
             sn.publisher AS publisher,
             sn.published_at AS publishedAt
      FROM stock_news sn
      JOIN stock_news_map snm ON sn.id = snm.news_id
      JOIN news_keyword_map nkm ON sn.id = nkm.news_id
      WHERE snm.stock_id = :stockId
        AND nkm.keyword_id IN :keywordIds
        AND sn.published_at IS NOT NULL
      ORDER BY sn.published_at DESC, sn.id DESC
      LIMIT :limit
      """, nativeQuery = true)
  List<StockNewsSummaryProjection> findLatestNewsByStockIdAndKeywordIds(
      @Param("stockId") Long stockId,
      @Param("keywordIds") List<Long> keywordIds,
      @Param("limit") int limit
  );
}
