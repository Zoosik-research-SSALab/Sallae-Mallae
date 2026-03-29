package com.sallaemallae.backend.domain.health.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "헬스체크", description = "서버 상태 확인 API")
@RestController
public class HealthController {

  /** 서버 상태 확인 */
  @Operation(summary = "헬스체크", description = "서버 정상 동작 여부를 확인합니다.")
  @GetMapping({"/health", "/api/health"})
  public ResponseEntity<Map<String, String>> health() {
    return ResponseEntity.ok(Map.of("status", "OK", "service", "sallaemallae-backend"));
  }
}
