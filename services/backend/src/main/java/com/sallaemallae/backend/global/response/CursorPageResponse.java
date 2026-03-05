package com.sallaemallae.backend.global.response;

import java.util.List;

public record CursorPageResponse<T>(List<T> data, Meta meta) {

  public record Meta(Long nextCursor, boolean hasNext) {
  }
}
