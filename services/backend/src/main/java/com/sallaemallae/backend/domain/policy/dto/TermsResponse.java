package com.sallaemallae.backend.domain.policy.dto;

import com.sallaemallae.backend.domain.auth.entity.Terms;
import java.time.OffsetDateTime;

public record TermsResponse(
    Long id,
    String termType,
    String version,
    String title,
    String content,
    boolean isRequired,
    OffsetDateTime enforcedAt
) {
  public static TermsResponse from(Terms terms) {
    return new TermsResponse(
        terms.getId(),
        terms.getTermType().name(),
        terms.getVersion(),
        terms.getTitle(),
        terms.getContent(),
        terms.isRequired(),
        terms.getEnforcedAt()
    );
  }
}
