package com.sallaemallae.backend.global.dto;

import java.util.List;

public record CursorPageResponse<T>(List<T> data, Meta meta) {

  public record Meta(Long nextCursor, boolean hasNext) {
  }
}
