package com.sallaemallae.backend.domain.policy.service;

import com.sallaemallae.backend.domain.auth.enumtype.TermType;
import com.sallaemallae.backend.domain.policy.dto.TermsResponse;
import com.sallaemallae.backend.domain.policy.dto.TermsSummaryResponse;
import java.util.List;

public interface PolicyService {

  List<TermsSummaryResponse> getTermsList();

  TermsResponse getByType(TermType termType);
}
