package com.sallaemallae.backend.global.config;

import com.sallaemallae.backend.domain.auth.exception.AuthErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class JwtAccessDeniedHandler implements AccessDeniedHandler {

  @Override
  public void handle(HttpServletRequest request, HttpServletResponse response,
      AccessDeniedException accessDeniedException) throws IOException {

    log.warn("Access denied to {}: {}", request.getRequestURI(),
        accessDeniedException.getMessage());

    AuthErrorCode errorCode = AuthErrorCode.AUTH_FORBIDDEN;
    response.setStatus(errorCode.getStatus());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");

    response.getWriter().write(
        "{\"success\":false,\"data\":null,\"error\":{\"code\":\"" + errorCode.getCode()
            + "\",\"message\":\"" + errorCode.getMessage() + "\"}}");
  }
}
