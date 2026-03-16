package com.sallaemallae.backend.domain.health.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sallaemallae.backend.domain.health.dto.KisHealthResponse;
import com.sallaemallae.backend.domain.health.service.KisHealthService;
import com.sallaemallae.backend.domain.stock.service.StockMarketQueryService;
import com.sallaemallae.backend.domain.stock.service.StockRealtimeMinuteService;
import com.sallaemallae.backend.global.security.ratelimit.RateLimitResult;
import com.sallaemallae.backend.global.security.ratelimit.RateLimitService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class KisHealthControllerSecurityTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private KisHealthService kisHealthService;

  @MockitoBean
  private StockMarketQueryService stockMarketQueryService;

  @MockitoBean
  private StockRealtimeMinuteService stockRealtimeMinuteService;

  @MockitoBean
  private JavaMailSender javaMailSender;

  @MockitoBean
  private RateLimitService rateLimitService;

  @BeforeEach
  void setUp() {
    given(rateLimitService.checkIpLimit(anyString(), any()))
        .willReturn(RateLimitResult.allowed(100, 99, 60));
    given(kisHealthService.check("005930"))
        .willReturn(new KisHealthResponse(
            true,
            "paper",
            "https://openapivts.koreainvestment.com:29443",
            true,
            true,
            "005930",
            70000,
            true,
            "KIS:QUOTE:J:005930:V1",
            "OK",
            null
        ));
  }

  @Test
  void check_requiresAuthentication() throws Exception {
    mockMvc.perform(get("/api/internal/kis"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void check_allowsAdminRole() throws Exception {
    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
        1L,
        null,
        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
    );

    mockMvc.perform(get("/api/internal/kis").with(authentication(authentication)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.status").value("OK"))
        .andExpect(jsonPath("$.data.sampleTicker").value("005930"));
  }
}
