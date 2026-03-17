package com.sallaemallae.backend.global.config;

import com.sallaemallae.backend.global.security.jwt.JwtAuthenticationFilter;
import com.sallaemallae.backend.global.security.ratelimit.RateLimitFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

  private final JwtAuthenticationFilter jwtAuthenticationFilter;
  private final RateLimitFilter rateLimitFilter;
  private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
  private final JwtAccessDeniedHandler jwtAccessDeniedHandler;

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        // CSRF 비활성화 (JWT 사용)
        .csrf(AbstractHttpConfigurer::disable)

        // CORS 설정
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))

        // 세션 사용 안함 (Stateless)
        .sessionManagement(session ->
            session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

        // 예외 처리
        .exceptionHandling(exception -> exception
            .authenticationEntryPoint(jwtAuthenticationEntryPoint)
            .accessDeniedHandler(jwtAccessDeniedHandler))

        // URL별 권한 설정
        .authorizeHttpRequests(auth -> auth
            // Health check
            .requestMatchers("/health", "/health/**", "/api/health", "/api/health/**").permitAll()
            .requestMatchers("/error", "/error/**").permitAll()

            // Auth - 인증 불필요
            .requestMatchers("/api/auth/login").permitAll()
            .requestMatchers("/api/auth/signup").permitAll()
            .requestMatchers("/api/auth/refresh").permitAll()
            .requestMatchers("/api/auth/check-email/**").permitAll()
            .requestMatchers("/api/auth/email/**").permitAll()
            .requestMatchers("/api/auth/password/reset-request").permitAll()
            .requestMatchers("/api/auth/password/reset").permitAll()
            .requestMatchers("/api/auth/policy").permitAll()
            .requestMatchers("/api/auth/status").permitAll()

            // Policy - 약관 조회 (인증 불필요)
            .requestMatchers("/api/policy/**").permitAll()
            .requestMatchers("/api/auth/oauth/*/start").permitAll()
            .requestMatchers("/api/auth/google/callback").permitAll()
            .requestMatchers("/api/auth/naver/callback").permitAll()
            .requestMatchers("/api/auth/kakao/callback").permitAll()

            // Auth - 인증 필요
            .requestMatchers("/api/auth/logout").authenticated()
            .requestMatchers("/api/auth/logout/all").authenticated()
            .requestMatchers("/api/auth/sessions/**").authenticated()

            // Main - 메인 페이지 (인증 불필요)
            .requestMatchers("/api/main/**").permitAll()
            .requestMatchers("/api/stocks", "/api/stocks/**").permitAll()
            .requestMatchers("/api/stream/stocks/*/prices").permitAll()
            // SSE 스트림 엔드포인트 (인증 불필요)
            .requestMatchers("/api/stream/main/**").permitAll()
            .requestMatchers("/api/internal/kis/**").hasRole("ADMIN")

            // Swagger / API docs (개발용)
            .requestMatchers(
                "/api/swagger-ui.html",
                "/api/swagger-ui/**",
                "/api/api-docs/**",
                "/swagger-ui/**",
                "/api-docs/**",
                "/v3/api-docs/**"
            ).permitAll()

            // 나머지는 인증 필요
            .anyRequest().authenticated()
        )

        // Rate Limit 필터 → JWT 필터 순서로 추가
        .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
        .addFilterAfter(jwtAuthenticationFilter, RateLimitFilter.class);

    return http.build();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();

    // 허용할 Origin (로컬 개발용, 배포 시 nginx 프록시로 Same-Origin)
    configuration.setAllowedOrigins(List.of(
        "http://localhost:3000",
        "http://localhost:5173",
        "https://j14d208.p.ssafy.io"
    ));

    // 허용할 HTTP 메서드
    configuration.setAllowedMethods(List.of(
        HttpMethod.GET.name(),
        HttpMethod.POST.name(),
        HttpMethod.PUT.name(),
        HttpMethod.PATCH.name(),
        HttpMethod.DELETE.name(),
        HttpMethod.OPTIONS.name()
    ));

    // 허용할 헤더
    configuration.setAllowedHeaders(List.of("*"));

    // 자격 증명 허용 (쿠키)
    configuration.setAllowCredentials(true);

    // 노출할 헤더 (Rate Limit 등)
    configuration.setExposedHeaders(List.of(
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
        "Retry-After"
    ));

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }
}
