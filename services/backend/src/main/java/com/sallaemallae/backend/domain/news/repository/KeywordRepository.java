package com.sallaemallae.backend.domain.news.repository;

import com.sallaemallae.backend.domain.news.entity.Keyword;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface KeywordRepository extends JpaRepository<Keyword, Long> {

  interface KeywordSummaryProjection {

    Long getId();

    String getName();

    Long getMentionCount();
  }

  // 뉴스 ID로 연결된 키워드 이름 조회
  @Query(value = """
      SELECT k.name
      FROM keywords k
      JOIN news_keyword_map nkm ON k.id = nkm.keyword_id
      WHERE nkm.news_id = :newsId
      """, nativeQuery = true)
  List<String> findKeywordNamesByNewsId(@Param("newsId") Long newsId);

  @Query(value = """
      SELECT k.id AS id,
             k.name AS name,
             COUNT(*) AS mentionCount
      FROM stock_news_map snm
      JOIN news_keyword_map nkm ON snm.news_id = nkm.news_id
      JOIN keywords k ON k.id = nkm.keyword_id
      WHERE snm.stock_id = :stockId
      GROUP BY k.id, k.name
      ORDER BY COUNT(*) DESC, k.id ASC
      LIMIT :limit
      """, nativeQuery = true)
  List<KeywordSummaryProjection> findTopKeywordsByStockId(@Param("stockId") Long stockId, @Param("limit") int limit);
}
