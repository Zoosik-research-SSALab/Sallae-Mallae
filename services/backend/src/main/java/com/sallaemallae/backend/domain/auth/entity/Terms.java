package com.sallaemallae.backend.domain.auth.entity;

import com.sallaemallae.backend.domain.auth.enumtype.TermType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "terms")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Terms {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Enumerated(EnumType.STRING)
  @Column(name = "term_type", nullable = false, length = 20)
  private TermType termType;

  @Column(nullable = false, length = 20)
  private String version;

  @Column(nullable = false, length = 50)
  private String title;

  @Column(nullable = false, columnDefinition = "text")
  private String content;

  @Column(name = "is_required", nullable = false)
  private boolean isRequired;

  @Column(name = "is_active", nullable = false)
  private boolean isActive;

  @Column(name = "enforced_at")
  private OffsetDateTime enforcedAt;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
