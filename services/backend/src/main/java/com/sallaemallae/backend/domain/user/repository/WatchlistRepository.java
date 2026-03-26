package com.sallaemallae.backend.domain.user.repository;

import com.sallaemallae.backend.domain.news.entity.StockNews;
import com.sallaemallae.backend.domain.user.entity.UserWatchlist;
import com.sallaemallae.backend.domain.user.entity.UserWatchlistId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WatchlistRepository extends JpaRepository<UserWatchlist, UserWatchlistId> {

  List<UserWatchlist> findAllByIdUserId(Long userId);

  @Query("select w.id.stockId from UserWatchlist w where w.id.userId = :userId")
  List<Long> findStockIdsByUserId(@Param("userId") Long userId);

  long countByIdUserId(Long userId);

  @Query(value = "SELECT COUNT(*) FROM (SELECT 1 FROM user_watchlist WHERE user_id = :userId FOR UPDATE) sub", nativeQuery = true)
  long countByUserIdForUpdate(@Param("userId") Long userId);

  // FS-WATCH-006: 관심종목 뉴스 목록 조회 (키워드 없음, 기간 필터)
  @Query("""
      SELECT sn FROM StockNews sn
      WHERE sn.publishedAt IS NOT NULL
        AND EXISTS (SELECT 1 FROM StockNewsMap snm
                    JOIN UserWatchlist uw ON snm.id.stockId = uw.id.stockId
                    WHERE snm.id.newsId = sn.id AND uw.id.userId = :userId)
        AND (CAST(:startDateTime AS timestamp) IS NULL OR sn.publishedAt >= :startDateTime)
        AND sn.publishedAt <= :endDateTime
      ORDER BY sn.publishedAt DESC
      """)
  List<StockNews> findWatchlistNews(
      @Param("userId") Long userId,
      @Param("startDateTime") java.time.OffsetDateTime startDateTime,
      @Param("endDateTime") java.time.OffsetDateTime endDateTime,
      org.springframework.data.domain.Pageable pageable);

  // FS-WATCH-006: 관심종목 뉴스 총 개수 (키워드 없음, 기간 필터)
  @Query("""
      SELECT COUNT(sn) FROM StockNews sn
      WHERE sn.publishedAt IS NOT NULL
        AND EXISTS (SELECT 1 FROM StockNewsMap snm
                    JOIN UserWatchlist uw ON snm.id.stockId = uw.id.stockId
                    WHERE snm.id.newsId = sn.id AND uw.id.userId = :userId)
        AND (CAST(:startDateTime AS timestamp) IS NULL OR sn.publishedAt >= :startDateTime)
        AND sn.publishedAt <= :endDateTime
      """)
  long countWatchlistNews(
      @Param("userId") Long userId,
      @Param("startDateTime") java.time.OffsetDateTime startDateTime,
      @Param("endDateTime") java.time.OffsetDateTime endDateTime);

  // FS-WATCH-006: 관심종목 뉴스 목록 조회 (키워드 필터, 기간 필터)
  @Query("""
      SELECT sn FROM StockNews sn
      WHERE sn.publishedAt IS NOT NULL
        AND EXISTS (SELECT 1 FROM StockNewsMap snm
                    JOIN UserWatchlist uw ON snm.id.stockId = uw.id.stockId
                    WHERE snm.id.newsId = sn.id AND uw.id.userId = :userId)
        AND EXISTS (SELECT 1 FROM NewsKeywordMap nkm
                    JOIN Keyword k ON nkm.id.keywordId = k.id
                    WHERE nkm.id.newsId = sn.id AND k.name = :keyword)
        AND (CAST(:startDateTime AS timestamp) IS NULL OR sn.publishedAt >= :startDateTime)
        AND sn.publishedAt <= :endDateTime
      ORDER BY sn.publishedAt DESC
      """)
  List<StockNews> findWatchlistNewsByKeyword(
      @Param("userId") Long userId,
      @Param("keyword") String keyword,
      @Param("startDateTime") java.time.OffsetDateTime startDateTime,
      @Param("endDateTime") java.time.OffsetDateTime endDateTime,
      org.springframework.data.domain.Pageable pageable);

  // FS-WATCH-006: 관심종목 뉴스 총 개수 (키워드 필터, 기간 필터)
  @Query("""
      SELECT COUNT(sn) FROM StockNews sn
      WHERE sn.publishedAt IS NOT NULL
        AND EXISTS (SELECT 1 FROM StockNewsMap snm
                    JOIN UserWatchlist uw ON snm.id.stockId = uw.id.stockId
                    WHERE snm.id.newsId = sn.id AND uw.id.userId = :userId)
        AND EXISTS (SELECT 1 FROM NewsKeywordMap nkm
                    JOIN Keyword k ON nkm.id.keywordId = k.id
                    WHERE nkm.id.newsId = sn.id AND k.name = :keyword)
        AND (CAST(:startDateTime AS timestamp) IS NULL OR sn.publishedAt >= :startDateTime)
        AND sn.publishedAt <= :endDateTime
      """)
  long countWatchlistNewsByKeyword(
      @Param("userId") Long userId,
      @Param("keyword") String keyword,
      @Param("startDateTime") java.time.OffsetDateTime startDateTime,
      @Param("endDateTime") java.time.OffsetDateTime endDateTime);

  // 여러 뉴스 ID에 대한 관련 종목명 일괄 조회 (N+1 방지)
  @Query("""
      SELECT snm.id.newsId, s.name
      FROM StockNewsMap snm
      JOIN Stock s ON snm.id.stockId = s.id
      WHERE snm.id.newsId IN :newsIds
      """)
  List<Object[]> findStockNamesByNewsIds(@Param("newsIds") List<Long> newsIds);
}
