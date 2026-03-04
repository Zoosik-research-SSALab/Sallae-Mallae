package com.sallaemallae.backend.domain.main.repository;

import com.sallaemallae.backend.domain.main.dto.MainSummaryResponse;
import java.util.Optional;

public interface MainCacheRepository {

  Optional<MainSummaryResponse> getSummary();
}
