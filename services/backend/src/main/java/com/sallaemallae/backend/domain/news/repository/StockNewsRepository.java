package com.sallaemallae.backend.domain.news.repository;

import com.sallaemallae.backend.domain.news.entity.StockNews;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockNewsRepository extends JpaRepository<StockNews, Long> {
}
