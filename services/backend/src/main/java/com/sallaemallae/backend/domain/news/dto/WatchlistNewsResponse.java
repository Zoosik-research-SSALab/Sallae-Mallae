package com.sallaemallae.backend.domain.news.dto;

import java.util.List;

public record WatchlistNewsResponse(List<WatchlistNewsItemResponse> news) {
}
