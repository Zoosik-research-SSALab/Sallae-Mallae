package com.sallaemallae.backend.domain.signal.controller;

import com.sallaemallae.backend.domain.signal.dto.SignalItemResponse;
import com.sallaemallae.backend.domain.signal.service.SignalService;
import com.sallaemallae.backend.global.dto.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/signals")
@RequiredArgsConstructor
public class SignalController {

  private final SignalService signalService;

  @GetMapping
  public ApiResponse<List<SignalItemResponse>> getSignals(
      @RequestParam(required = false) Long cursor,
      @RequestParam(defaultValue = "6") int size
  ) {
    return ApiResponse.ok(signalService.getSignals(cursor, size));
  }
}
