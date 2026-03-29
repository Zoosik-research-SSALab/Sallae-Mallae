package com.sallaemallae.backend.domain.policy.service;

import com.sallaemallae.backend.domain.auth.enumtype.TermType;
import com.sallaemallae.backend.domain.policy.dto.TermsResponse;

public interface PolicyService {

  TermsResponse getByType(TermType termType);
}
