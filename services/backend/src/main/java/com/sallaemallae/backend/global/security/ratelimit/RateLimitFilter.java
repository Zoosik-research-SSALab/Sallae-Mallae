package com.sallaemallae.backend.global.security.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

  private final RateLimitService rateLimitService;

  private static final Map<String, RateLimitPolicy> ENDPOINT_POLICIES = Map.ofEntries(
      Map.entry("POST:/api/auth/login", RateLimitPolicy.LOGIN),
      Map.entry("POST:/api/auth/email/send-code", RateLimitPolicy.EMAIL_SEND),
      Map.entry("POST:/api/auth/email/verify-code", RateLimitPolicy.EMAIL_VERIFY),
      Map.entry("POST:/api/auth/signup", RateLimitPolicy.SIGNUP),
      Map.entry("POST:/api/auth/refresh", RateLimitPolicy.REFRESH),
      Map.entry("POST:/api/auth/password/reset-request", RateLimitPolicy.PWD_RESET_REQUEST),
      Map.entry("POST:/api/auth/password/reset", RateLimitPolicy.PWD_RESET),
      Map.entry("POST:/api/auth/policy", RateLimitPolicy.POLICY),
      Map.entry("POST:/api/auth/google/callback", RateLimitPolicy.OAUTH),
      Map.entry("POST:/api/auth/naver/callback", RateLimitPolicy.OAUTH),
      Map.entry("POST:/api/auth/kakao/callback", RateLimitPolicy.OAUTH)
  );

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {

    String method = request.getMethod();
    String uri = request.getRequestURI();
    String ip = getClientIp(request);

    // 엔드포인트별 정책 매칭
    RateLimitPolicy policy = resolvePolicy(method, uri);
    if (policy == null) {
      policy = RateLimitPolicy.GENERAL;
    }

    RateLimitResult result = rateLimitService.checkIpLimit(ip, policy);

    // Rate Limit 응답 헤더 설정
    response.setIntHeader("X-RateLimit-Limit", result.getLimit());
    response.setIntHeader("X-RateLimit-Remaining", result.getRemaining());
    response.setHeader("X-RateLimit-Reset",
        String.valueOf(System.currentTimeMillis() / 1000 + result.getResetSeconds()));

    if (!result.isAllowed()) {
      response.setHeader("Retry-After", String.valueOf(result.getResetSeconds()));
      response.setStatus(429);
      response.setContentType("application/json;charset=UTF-8");
      response.getWriter().write(
          "{\"status\":429,\"code\":\"RATE_001\",\"message\":\"요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.\"}");
      return;
    }

    filterChain.doFilter(request, response);
  }

  private RateLimitPolicy resolvePolicy(String method, String uri) {
    // 정확한 매칭
    RateLimitPolicy policy = ENDPOINT_POLICIES.get(method + ":" + uri);
    if (policy != null) {
      return policy;
    }

    // check-email은 path variable이 있으므로 prefix 매칭
    if ("GET".equals(method) && uri.startsWith("/api/auth/check-email/")) {
      return RateLimitPolicy.CHECK_EMAIL;
    }

    // OAuth start
    if ("GET".equals(method) && uri.matches("/api/auth/oauth/.+/start")) {
      return RateLimitPolicy.OAUTH;
    }

    return null;
  }

  private String getClientIp(HttpServletRequest request) {
    String xForwardedFor = request.getHeader("X-Forwarded-For");
    if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
      return xForwardedFor.split(",")[0].trim();
    }
    String xRealIp = request.getHeader("X-Real-IP");
    if (xRealIp != null && !xRealIp.isEmpty()) {
      return xRealIp;
    }
    return request.getRemoteAddr();
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String uri = request.getRequestURI();
    // health check, swagger는 제외
    return uri.startsWith("/health") || uri.startsWith("/swagger-ui")
        || uri.startsWith("/v3/api-docs");
  }
}
