package com.sallaemallae.backend.infra.kis.stock;

public record KisTopInterestStockItem(
    int dataRank,
    String ticker,
    String name,
    Integer price,
    Integer changePrice,
    String changeSign,
    Float fluctuationRate,
    Long volume,
    Long tradingValue,
    Integer askPrice,
    Integer bidPrice,
    Integer interestCount
) {
}
