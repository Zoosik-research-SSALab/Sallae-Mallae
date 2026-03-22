package com.sallaemallae.backend.domain.news.repository;

import com.sallaemallae.backend.domain.news.entity.StockNews;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockNewsRepository extends JpaRepository<StockNews, Long> {

  // FS-NEWS-001: 키워드 필터 적용된 뉴스 목록 (keyword null이면 전체)
  @Query("""
      SELECT DISTINCT sn FROM StockNews sn
      LEFT JOIN NewsKeywordMap nkm ON sn.id = nkm.id.newsId
      LEFT JOIN Keyword k ON nkm.id.keywordId = k.id
      WHERE sn.publishedAt IS NOT NULL
        AND (:keyword IS NULL OR k.name = :keyword)
      ORDER BY sn.publishedAt DESC
      """)
  List<StockNews> findNewsWithOptionalKeyword(
      @Param("keyword") String keyword,
      org.springframework.data.domain.Pageable pageable);

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
}
