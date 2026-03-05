package com.sallaemallae.backend.domain.policy.service;

import java.util.Map;

public interface PolicyService {

  Map<String, Object> getTerms();

  Map<String, Object> getPrivacy();

  Map<String, Object> getDisclaimer();
}
