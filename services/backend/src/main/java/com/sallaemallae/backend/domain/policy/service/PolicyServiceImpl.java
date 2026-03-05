package com.sallaemallae.backend.domain.policy.service;

import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PolicyServiceImpl implements PolicyService {

  @Override
  public Map<String, Object> getTerms() {
    return Map.of("policyType", "TERMS", "version", "v1.0", "content", "terms boilerplate");
  }

  @Override
  public Map<String, Object> getPrivacy() {
    return Map.of("policyType", "PRIVACY", "version", "v1.0", "content", "privacy boilerplate");
  }

  @Override
  public Map<String, Object> getDisclaimer() {
    return Map.of("policyType", "DISCLAIMER", "version", "v1.0", "content", "disclaimer boilerplate");
  }
}
