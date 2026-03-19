package com.sallaemallae.backend.domain.policy.service;

import com.sallaemallae.backend.domain.auth.entity.Terms;
import com.sallaemallae.backend.domain.auth.enumtype.TermType;
import com.sallaemallae.backend.domain.auth.repository.TermsRepository;
import com.sallaemallae.backend.domain.policy.dto.TermsResponse;
import com.sallaemallae.backend.domain.policy.exception.PolicyErrorCode;
import com.sallaemallae.backend.global.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PolicyServiceImpl implements PolicyService {

  private final TermsRepository termsRepository;

  @Override
  public TermsResponse getByType(TermType termType) {
    Terms terms = termsRepository.findByTermTypeAndIsActiveTrue(termType)
        .orElseThrow(() -> new BusinessException(PolicyErrorCode.POLICY_NOT_FOUND));

    return TermsResponse.from(terms);
  }
}
