package com.sallaemallae.backend.domain.news.repository;

import com.sallaemallae.backend.domain.news.entity.Keyword;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KeywordRepository extends JpaRepository<Keyword, Long> {
}
