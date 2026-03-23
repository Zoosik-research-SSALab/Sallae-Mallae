package com.sallaemallae.backend.global.util;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * offset 기반 Pageable 구현. PageRequest.of(page, size)와 달리 임의 offset을 정확히 처리한다.
 */
public class OffsetBasedPageRequest implements Pageable {

  private final int offset;
  private final int limit;
  private final Sort sort;

  public OffsetBasedPageRequest(int offset, int limit) {
    this(offset, limit, Sort.unsorted());
  }

  public OffsetBasedPageRequest(int offset, int limit, Sort sort) {
    this.offset = offset;
    this.limit = limit;
    this.sort = sort;
  }

  @Override
  public int getPageNumber() {
    return offset / limit;
  }

  @Override
  public int getPageSize() {
    return limit;
  }

  @Override
  public long getOffset() {
    return offset;
  }

  @Override
  public Sort getSort() {
    return sort;
  }

  @Override
  public Pageable next() {
    return new OffsetBasedPageRequest(offset + limit, limit, sort);
  }

  @Override
  public Pageable previousOrFirst() {
    return offset <= limit ? first() : new OffsetBasedPageRequest(offset - limit, limit, sort);
  }

  @Override
  public Pageable first() {
    return new OffsetBasedPageRequest(0, limit, sort);
  }

  @Override
  public Pageable withPage(int pageNumber) {
    return new OffsetBasedPageRequest(pageNumber * limit, limit, sort);
  }

  @Override
  public boolean hasPrevious() {
    return offset > 0;
  }
}
