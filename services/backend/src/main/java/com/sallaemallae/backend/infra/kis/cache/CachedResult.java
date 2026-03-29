package com.sallaemallae.backend.infra.kis.cache;

public record CachedResult<T>(String cacheKey, boolean cacheHit, T value) {
}
