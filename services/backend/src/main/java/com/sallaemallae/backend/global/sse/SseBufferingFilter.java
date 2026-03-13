package com.sallaemallae.backend.global.sse;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * SSE 응답에 X-Accel-Buffering: no 헤더를 자동 추가하는 필터.
 * nginx가 이 헤더를 감지하면 해당 응답의 프록시 버퍼링을 비활성화합니다.
 * 이를 통해 nginx 설정 변경 없이 모든 SSE 엔드포인트에서 실시간 전송이 보장됩니다.
 */
@Component
public class SseBufferingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
        FilterChain filterChain) throws ServletException, IOException {

        String accept = request.getHeader("Accept");
        if (accept != null && accept.contains(MediaType.TEXT_EVENT_STREAM_VALUE)) {
            response.setHeader("X-Accel-Buffering", "no");
            response.setBufferSize(0); // Tomcat 응답 버퍼 비활성화 → 즉시 flush
        }

        filterChain.doFilter(request, response);
    }
}
