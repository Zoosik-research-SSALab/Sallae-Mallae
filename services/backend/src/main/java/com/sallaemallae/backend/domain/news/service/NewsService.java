package com.sallaemallae.backend.domain.news.service;

import com.sallaemallae.backend.domain.news.dto.NewsItemResponse;
import java.util.List;

public interface NewsService {

  List<NewsItemResponse> getLatestNews();
}
