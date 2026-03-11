package com.sallaemallae.backend.domain.policy.service;

import java.util.List;
import java.util.Map;

public interface PolicyService {

  List<Map<String, Object>> getTermsList();

  Map<String, Object> getTerms();

  Map<String, Object> getPrivacy();

  Map<String, Object> getDisclaimer();
}
