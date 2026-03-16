package com.sallaemallae.backend.global.security;

import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.global.exception.GlobalErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class AuthenticatedUserProvider {

  public Long getCurrentUserId() {
    Long userId = getCurrentUserIdOrNull();
    if (userId == null) {
      throw new BusinessException(GlobalErrorCode.UNAUTHORIZED);
    }
    return userId;
  }

  public Long getCurrentUserIdOrNull() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication == null || !(authentication.getPrincipal() instanceof Long userId) || userId <= 0) {
      return null;
    }

    return userId;
  }
}
