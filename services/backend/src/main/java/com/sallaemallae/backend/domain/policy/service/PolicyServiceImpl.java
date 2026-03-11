package com.sallaemallae.backend.domain.policy.service;

import com.sallaemallae.backend.domain.auth.entity.Terms;
import com.sallaemallae.backend.domain.auth.enumtype.TermType;
import com.sallaemallae.backend.domain.auth.repository.TermsRepository;
import com.sallaemallae.backend.domain.policy.exception.PolicyErrorCode;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PolicyServiceImpl implements PolicyService {

  private final TermsRepository termsRepository;

  @Override
  public List<Map<String, Object>> getTermsList() {
    return termsRepository.findActiveTerms().stream()
        .map(this::buildSummaryResponse)
        .toList();
  }

  @Override
  public Map<String, Object> getTerms() {
    Terms terms = termsRepository.findByTermTypeAndIsActiveTrue(TermType.SERVICE)
        .orElseThrow(() -> new BusinessException(PolicyErrorCode.POLICY_NOT_FOUND));

    return buildResponse(terms);
  }

  @Override
  public Map<String, Object> getPrivacy() {
    Terms terms = termsRepository.findByTermTypeAndIsActiveTrue(TermType.PRIVACY)
        .orElseThrow(() -> new BusinessException(PolicyErrorCode.POLICY_NOT_FOUND));

    return buildResponse(terms);
  }

  @Override
  public Map<String, Object> getDisclaimer() {
    Terms terms = termsRepository.findByTermTypeAndIsActiveTrue(TermType.INVESTMENT_DISCLAIMER)
        .orElseThrow(() -> new BusinessException(PolicyErrorCode.POLICY_NOT_FOUND));

    return buildResponse(terms);
  }

  private Map<String, Object> buildResponse(Terms terms) {
    return Map.of(
        "id", terms.getId(),
        "termType", terms.getTermType().name(),
        "version", terms.getVersion(),
        "title", terms.getTitle(),
        "content", terms.getContent(),
        "isRequired", terms.isRequired(),
        "enforcedAt", terms.getEnforcedAt() != null ? terms.getEnforcedAt().toString() : ""
    );
  }

  private Map<String, Object> buildSummaryResponse(Terms terms) {
    return Map.of(
        "id", terms.getId(),
        "termType", terms.getTermType().name(),
        "title", terms.getTitle(),
        "isRequired", terms.isRequired()
    );
  }
}
