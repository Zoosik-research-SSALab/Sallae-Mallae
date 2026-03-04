package com.sallaemallae.backend.domain.stock.repository;

import com.sallaemallae.backend.domain.stock.entity.UserWatchlist;
import com.sallaemallae.backend.domain.stock.entity.UserWatchlistId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserWatchlistRepository extends JpaRepository<UserWatchlist, UserWatchlistId> {
}
