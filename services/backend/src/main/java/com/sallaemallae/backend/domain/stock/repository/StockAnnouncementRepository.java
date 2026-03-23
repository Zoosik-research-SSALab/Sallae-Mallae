package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.StockAnnouncement;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockAnnouncementRepository extends JpaRepository<StockAnnouncement, Long> {

  long countByStockId(Long stockId);

  @Query(value = """
      SELECT *
      FROM stock_announcements sa
      WHERE sa.stock_id = :stockId
      ORDER BY sa.announced_at DESC, sa.id DESC
      LIMIT :limit OFFSET :offset
      """, nativeQuery = true)
  List<StockAnnouncement> findPageByStockId(
      @Param("stockId") Long stockId,
      @Param("limit") int limit,
      @Param("offset") int offset
  );

  Optional<StockAnnouncement> findByIdAndStockId(Long id, Long stockId);

  @Query("""
      select sa
      from StockAnnouncement sa
      where sa.stockId = :stockId
        and sa.announcedAt >= :fromDate
        and (
          lower(sa.title) like lower(concat('%', :keyword, '%'))
          or lower(coalesce(sa.content, '')) like lower(concat('%', :keyword, '%'))
        )
      order by sa.announcedAt asc, sa.id asc
      """)
  List<StockAnnouncement> findDividendAnnouncements(
      @Param("stockId") Long stockId,
      @Param("fromDate") LocalDate fromDate,
      @Param("keyword") String keyword
  );
}
