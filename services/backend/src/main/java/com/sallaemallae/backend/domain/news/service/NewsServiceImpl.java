package com.sallaemallae.backend.domain.news.service;

import com.sallaemallae.backend.domain.news.dto.NewsItemResponse;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class NewsServiceImpl implements NewsService {

  @Override
  public List<NewsItemResponse> getLatestNews() {
    return List.of(new NewsItemResponse(1L, "news boilerplate", "publisher", OffsetDateTime.now()));
  }
}
