package com.sallaemallae.backend.global.security;

import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.global.exception.GlobalErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class AuthenticatedUserProvider {

  public Long getCurrentUserId() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication == null || !(authentication.getPrincipal() instanceof Long userId) || userId <= 0) {
      throw new BusinessException(GlobalErrorCode.UNAUTHORIZED);
    }

    return userId;
  }
}
