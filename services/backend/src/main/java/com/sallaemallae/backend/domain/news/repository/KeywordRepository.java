package com.sallaemallae.backend.domain.news.repository;

import com.sallaemallae.backend.domain.news.entity.Keyword;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface KeywordRepository extends JpaRepository<Keyword, Long> {

  // FS-NEWS-002: 뉴스 매핑 횟수 기준 상위 10개 키워드
  @Query(value = """
      SELECT k.name, COUNT(nkm.news_id) AS cnt
      FROM keywords k
      JOIN news_keyword_map nkm ON k.id = nkm.keyword_id
      GROUP BY k.id, k.name
      ORDER BY cnt DESC
      LIMIT 10
      """, nativeQuery = true)
  List<Object[]> findTrendingKeywords();
}
