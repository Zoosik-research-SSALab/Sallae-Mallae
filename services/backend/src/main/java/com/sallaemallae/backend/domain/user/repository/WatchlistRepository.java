package com.sallaemallae.backend.domain.user.repository;

import com.sallaemallae.backend.domain.notification.entity.UserWatchlist;
import com.sallaemallae.backend.domain.notification.entity.UserWatchlistId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WatchlistRepository extends JpaRepository<UserWatchlist, UserWatchlistId> {

  // FS-WATCH-006: 관심종목 보유 종목의 최신 뉴스 조회
  @Query(value = """
      SELECT DISTINCT sn.id, sn.title, sn.snippet, sn.url, sn.publisher, sn.published_at
      FROM stock_news sn
      JOIN stock_news_map snm ON sn.id = snm.news_id
      JOIN user_watchlist uw ON snm.stock_id = uw.stock_id
      WHERE uw.user_id = :userId
      ORDER BY sn.published_at DESC
      LIMIT :limit
      """, nativeQuery = true)
  List<Object[]> findWatchlistNews(
      @Param("userId") Long userId,
      @Param("limit") int limit);

  // 여러 뉴스 ID에 대한 관련 종목명 일괄 조회 (N+1 방지)
  @Query(value = """
      SELECT snm.news_id, s.name
      FROM stock_news_map snm
      JOIN stocks s ON snm.stock_id = s.id
      WHERE snm.news_id IN :newsIds
      """, nativeQuery = true)
  List<Object[]> findStockNamesByNewsIds(@Param("newsIds") List<Long> newsIds);
}
