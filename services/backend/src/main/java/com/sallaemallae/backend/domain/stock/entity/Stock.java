package com.sallaemallae.backend.domain.stock.entity;

import com.sallaemallae.backend.domain.stock.enumtype.MarketType;
import com.sallaemallae.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "stocks")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Stock extends BaseTimeEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 6)
  private String ticker;

  @Column(nullable = false, length = 100)
  private String name;

  @Column(name = "gics_sector", length = 50)
  private String gicsSector;

  @Column(length = 50)
  private String category;

  @Column(name = "krx_sector", length = 15)
  private String krxSector;

  @Column(name = "gics_cluster", length = 20)
  private String gicsCluster;

  @Column(name = "outstanding_shares")
  private Long outstandingShares;

  @Enumerated(EnumType.STRING)
  @Column(name = "market_type", length = 20)
  private MarketType marketType;

  @Column(name = "is_active", nullable = false)
  private boolean isActive;

  @Column(name = "icon_url", length = 500)
  private String iconUrl;
}
