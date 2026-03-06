package com.sallaemallae.backend.global.security.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtProvider jwtProvider;
  private final RedisTokenService redisTokenService;

  private static final String AUTHORIZATION_HEADER = "Authorization";
  private static final String BEARER_PREFIX = "Bearer ";

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {

    String token = resolveToken(request);

    if (StringUtils.hasText(token) && jwtProvider.validateToken(token)) {
      // 블랙리스트 체크
      String jti = jwtProvider.getJti(token);
      if (redisTokenService.isBlacklisted(jti)) {
        log.warn("Blacklisted token used: jti={}", jti);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"status\":401,\"code\":\"AUTH_001\",\"message\":\"무효화된 토큰입니다.\"}");
        return;
      }

      // 인증 정보 설정
      Long userId = jwtProvider.getUserId(token);
      String role = jwtProvider.getRole(token);

      UsernamePasswordAuthenticationToken authentication =
          new UsernamePasswordAuthenticationToken(
              userId,
              null,
              List.of(new SimpleGrantedAuthority("ROLE_" + role))
          );

      // 추가 정보 저장 (deviceId, tokenVersion, authLevel 등)
      authentication.setDetails(new JwtAuthenticationDetails(
          jwtProvider.getDeviceId(token),
          jwtProvider.getTokenVersion(token),
          jwtProvider.getAuthLevel(token),
          jwtProvider.getAuthTime(token)
      ));

      SecurityContextHolder.getContext().setAuthentication(authentication);
      log.debug("Set authentication for user: {}", userId);
    }

    filterChain.doFilter(request, response);
  }

  /**
   * Request Header에서 토큰 추출
   */
  private String resolveToken(HttpServletRequest request) {
    String bearerToken = request.getHeader(AUTHORIZATION_HEADER);
    if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(BEARER_PREFIX)) {
      return bearerToken.substring(BEARER_PREFIX.length());
    }
    return null;
  }
}
