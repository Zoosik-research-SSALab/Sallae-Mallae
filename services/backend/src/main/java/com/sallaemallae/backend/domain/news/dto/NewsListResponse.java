package com.sallaemallae.backend.domain.news.dto;

import java.util.List;

public record NewsListResponse(List<NewsListItemResponse> news) {
}
