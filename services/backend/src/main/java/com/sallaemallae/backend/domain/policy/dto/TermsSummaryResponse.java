package com.sallaemallae.backend.domain.policy.dto;

import com.sallaemallae.backend.domain.auth.entity.Terms;

public record TermsSummaryResponse(
    Long id,
    String termType,
    String title,
    boolean isRequired
) {
  public static TermsSummaryResponse from(Terms terms) {
    return new TermsSummaryResponse(
        terms.getId(),
        terms.getTermType().name(),
        terms.getTitle(),
        terms.isRequired()
    );
  }
}
