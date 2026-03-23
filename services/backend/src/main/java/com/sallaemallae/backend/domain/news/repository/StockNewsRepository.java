package com.sallaemallae.backend.domain.news.repository;

import com.sallaemallae.backend.domain.news.entity.StockNews;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockNewsRepository extends JpaRepository<StockNews, Long> {

  interface StockNewsSummaryProjection {

    Long getId();

    String getTitle();

    String getPublisher();

    java.time.OffsetDateTime getPublishedAt();
  }

  // FS-NEWS-001: 키워드 필터 적용된 뉴스 목록 (keyword null이면 전체)
  @Query(value = """
      SELECT DISTINCT sn.id, sn.title, sn.publisher, sn.published_at
      FROM stock_news sn
      LEFT JOIN news_keyword_map nkm ON sn.id = nkm.news_id
      LEFT JOIN keywords k ON nkm.keyword_id = k.id
      WHERE sn.published_at IS NOT NULL
        AND (:keyword IS NULL OR k.name = :keyword)
      ORDER BY sn.published_at DESC
      LIMIT :limit OFFSET :offset
      """, nativeQuery = true)
  List<Object[]> findNewsWithOptionalKeyword(
      @Param("keyword") String keyword,
      @Param("limit") int limit,
      @Param("offset") int offset);

  // 여러 뉴스 ID에 대한 관련 종목명 일괄 조회 (N+1 방지)
  @Query(value = """
      SELECT snm.news_id, s.name
      FROM stock_news_map snm
      JOIN stocks s ON snm.stock_id = s.id
      WHERE snm.news_id IN :newsIds
      """, nativeQuery = true)
  List<Object[]> findStockNamesByNewsIds(@Param("newsIds") List<Long> newsIds);

  // FS-STOCK-008: 뉴스 모달용 관련 종목 상세 조회
  @Query(value = """
      SELECT s.id, s.name, s.ticker
      FROM stock_news_map snm
      JOIN stocks s ON snm.stock_id = s.id
      WHERE snm.news_id = :newsId
      """, nativeQuery = true)
  List<Object[]> findRelatedStocksByNewsId(@Param("newsId") Long newsId);

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
