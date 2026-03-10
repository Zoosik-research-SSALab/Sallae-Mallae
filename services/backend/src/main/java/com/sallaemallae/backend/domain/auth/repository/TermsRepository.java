package com.sallaemallae.backend.domain.auth.repository;

import com.sallaemallae.backend.domain.auth.entity.Terms;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TermsRepository extends JpaRepository<Terms, Long> {

  @Query("SELECT t.id FROM Terms t WHERE t.isActive = true AND t.isRequired = true")
  List<Long> findActiveRequiredTermsIds();

  @Query("SELECT t FROM Terms t WHERE t.isActive = true")
  List<Terms> findActiveTerms();
}
