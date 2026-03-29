package com.sallaemallae.backend.global.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

  private final ObjectMapper objectMapper;

  @Override
  public void commence(HttpServletRequest request, HttpServletResponse response,
      AuthenticationException authException) throws IOException {

    log.warn("Unauthorized request to {}: {}", request.getRequestURI(), authException.getMessage());

    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");

    Map<String, Object> body = new HashMap<>();
    body.put("status", 401);
    body.put("code", "AUTH_003");
    body.put("message", "인증이 필요합니다.");
    body.put("data", null);
    body.put("timestamp", OffsetDateTime.now().toString());

    objectMapper.writeValue(response.getOutputStream(), body);
  }
}
