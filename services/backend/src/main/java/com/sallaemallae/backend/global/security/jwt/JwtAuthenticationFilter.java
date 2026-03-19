package com.sallaemallae.backend.global.security.jwt;

import com.sallaemallae.backend.domain.auth.exception.AuthErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.sallaemallae.backend.domain.auth.entity.User;
import com.sallaemallae.backend.domain.auth.repository.UserRepository;
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
  private final UserRepository userRepository;

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
        writeErrorResponse(response, AuthErrorCode.AUTH_UNAUTHORIZED);
        return;
      }

      // 인증 정보 설정
      Long userId = jwtProvider.getUserId(token);
      Integer tokenVersion = jwtProvider.getTokenVersion(token);
      String role = jwtProvider.getRole(token);

      // tokenVersion DB 검증 (비밀번호 재설정 등으로 무효화된 토큰 차단)
      User user = userRepository.findById(userId).orElse(null);
      if (user == null || (tokenVersion != null && tokenVersion != user.getTokenVersion())) {
        log.warn("Token version mismatch for user {}: token={}, db={}",
            userId, tokenVersion, user != null ? user.getTokenVersion() : "N/A");
        writeErrorResponse(response, AuthErrorCode.TOKEN_VERSION_MISMATCH);
        return;
      }

      UsernamePasswordAuthenticationToken authentication =
          new UsernamePasswordAuthenticationToken(
              userId,
              null,
              List.of(new SimpleGrantedAuthority("ROLE_" + role))
          );

      // 추가 정보 저장 (deviceId, tokenVersion, authLevel 등)
      authentication.setDetails(new JwtAuthenticationDetails(
          jwtProvider.getDeviceId(token),
          tokenVersion,
          jwtProvider.getAuthLevel(token),
          jwtProvider.getAuthTime(token)
      ));

      SecurityContextHolder.getContext().setAuthentication(authentication);
      log.debug("Set authentication for user: {}", userId);
    }

    filterChain.doFilter(request, response);
  }

  private void writeErrorResponse(HttpServletResponse response, AuthErrorCode errorCode)
      throws IOException {
    response.setStatus(errorCode.getStatus());
    response.setContentType("application/json;charset=UTF-8");
    response.getWriter().write(
        "{\"success\":false,\"data\":null,\"error\":{\"code\":\"" + errorCode.getCode()
            + "\",\"message\":\"" + errorCode.getMessage() + "\"}}");
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
