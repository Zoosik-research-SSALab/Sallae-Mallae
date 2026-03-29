package com.sallaemallae.backend.domain.news.repository;

import com.sallaemallae.backend.domain.news.entity.StockNews;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockNewsRepository extends JpaRepository<StockNews, Long> {

  // FS-NEWS-001: 키워드 없이 전체 뉴스 목록 조회 (기간 필터)
  @Query("""
      SELECT sn FROM StockNews sn
      WHERE sn.publishedAt IS NOT NULL
        AND (CAST(:startDateTime AS timestamp) IS NULL OR sn.publishedAt >= :startDateTime)
        AND sn.publishedAt <= :endDateTime
      ORDER BY sn.publishedAt DESC
      """)
  List<StockNews> findAllNews(
      @Param("startDateTime") OffsetDateTime startDateTime,
      @Param("endDateTime") OffsetDateTime endDateTime,
      org.springframework.data.domain.Pageable pageable);

  // FS-NEWS-001: 키워드 없이 전체 뉴스 총 개수 (기간 필터)
  @Query("""
      SELECT COUNT(sn) FROM StockNews sn
      WHERE sn.publishedAt IS NOT NULL
        AND (CAST(:startDateTime AS timestamp) IS NULL OR sn.publishedAt >= :startDateTime)
        AND sn.publishedAt <= :endDateTime
      """)
  long countAllNews(
      @Param("startDateTime") OffsetDateTime startDateTime,
      @Param("endDateTime") OffsetDateTime endDateTime);

  // FS-NEWS-001: 키워드 필터 적용된 뉴스 목록 조회 (기간 필터)
  @Query("""
      SELECT sn FROM StockNews sn
      WHERE sn.publishedAt IS NOT NULL
        AND EXISTS (SELECT 1 FROM NewsKeywordMap nkm
                    JOIN Keyword k ON nkm.id.keywordId = k.id
                    WHERE nkm.id.newsId = sn.id AND k.name = :keyword)
        AND (CAST(:startDateTime AS timestamp) IS NULL OR sn.publishedAt >= :startDateTime)
        AND sn.publishedAt <= :endDateTime
      ORDER BY sn.publishedAt DESC
      """)
  List<StockNews> findNewsByKeyword(
      @Param("keyword") String keyword,
      @Param("startDateTime") OffsetDateTime startDateTime,
      @Param("endDateTime") OffsetDateTime endDateTime,
      org.springframework.data.domain.Pageable pageable);

  // FS-NEWS-001: 키워드 필터 적용된 뉴스 총 개수 (기간 필터)
  @Query("""
      SELECT COUNT(sn) FROM StockNews sn
      WHERE sn.publishedAt IS NOT NULL
        AND EXISTS (SELECT 1 FROM NewsKeywordMap nkm
                    JOIN Keyword k ON nkm.id.keywordId = k.id
                    WHERE nkm.id.newsId = sn.id AND k.name = :keyword)
        AND (CAST(:startDateTime AS timestamp) IS NULL OR sn.publishedAt >= :startDateTime)
        AND sn.publishedAt <= :endDateTime
      """)
  long countNewsByKeyword(
      @Param("keyword") String keyword,
      @Param("startDateTime") OffsetDateTime startDateTime,
      @Param("endDateTime") OffsetDateTime endDateTime);

  // 여러 뉴스 ID에 대한 관련 종목명 일괄 조회 (N+1 방지)
  @Query("""
      SELECT snm.id.newsId, s.name
      FROM StockNewsMap snm
      JOIN Stock s ON snm.id.stockId = s.id
      WHERE snm.id.newsId IN :newsIds
      """)
  List<Object[]> findStockNamesByNewsIds(@Param("newsIds") List<Long> newsIds);

  // FS-STOCK-008: 뉴스 모달용 관련 종목 상세 조회
  @Query("""
      SELECT s.id, s.name, s.ticker
      FROM StockNewsMap snm
      JOIN Stock s ON snm.id.stockId = s.id
      WHERE snm.id.newsId = :newsId
      """)
  List<Object[]> findRelatedStocksByNewsId(@Param("newsId") Long newsId);
}
