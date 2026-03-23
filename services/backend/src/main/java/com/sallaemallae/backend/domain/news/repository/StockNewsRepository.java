package com.sallaemallae.backend.domain.news.repository;

import com.sallaemallae.backend.domain.news.entity.StockNews;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockNewsRepository extends JpaRepository<StockNews, Long> {

  // FS-NEWS-001: 키워드 없이 전체 뉴스 목록 조회 (URL 기준 중복 제거)
  @Query("""
      SELECT sn FROM StockNews sn
      WHERE sn.publishedAt IS NOT NULL
        AND sn.id IN (SELECT MIN(sn2.id) FROM StockNews sn2 WHERE sn2.url IS NOT NULL GROUP BY sn2.url)
      ORDER BY sn.publishedAt DESC
      """)
  List<StockNews> findAllNews(org.springframework.data.domain.Pageable pageable);

  // FS-NEWS-001: 키워드 필터 적용된 뉴스 목록 조회 (URL 기준 중복 제거)
  @Query("""
      SELECT sn FROM StockNews sn
      WHERE sn.publishedAt IS NOT NULL
        AND sn.id IN (SELECT MIN(sn2.id) FROM StockNews sn2 WHERE sn2.url IS NOT NULL GROUP BY sn2.url)
        AND sn.id IN (SELECT nkm.id.newsId FROM NewsKeywordMap nkm
                       JOIN Keyword k ON nkm.id.keywordId = k.id
                       WHERE k.name = :keyword)
      ORDER BY sn.publishedAt DESC
      """)
  List<StockNews> findNewsByKeyword(
      @Param("keyword") String keyword,
      org.springframework.data.domain.Pageable pageable);

  // 여러 뉴스 ID에 대한 관련 종목명 일괄 조회 (같은 URL의 모든 매핑 종목 포함, N+1 방지)
  @Query("""
      SELECT sn.id, s.name
      FROM StockNews sn
      JOIN StockNews sn2 ON sn2.url = sn.url
      JOIN StockNewsMap snm ON snm.id.newsId = sn2.id
      JOIN Stock s ON snm.id.stockId = s.id
      WHERE sn.id IN :newsIds
      GROUP BY sn.id, s.name
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
