package com.sallaemallae.backend.domain.storage.controller;

import com.sallaemallae.backend.domain.storage.dto.request.PresignedUrlRequest;
import com.sallaemallae.backend.domain.storage.dto.response.PresignedUrlResponse;
import com.sallaemallae.backend.domain.storage.service.FileStorageService;
import com.sallaemallae.backend.global.response.ApiResponse;
import com.sallaemallae.backend.global.security.AuthenticatedUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Storage", description = "파일 스토리지 API")
@RestController
@RequestMapping("/api/storage")
@RequiredArgsConstructor
public class StorageController {

  private final FileStorageService fileStorageService;
  private final AuthenticatedUserProvider authenticatedUserProvider;

  @Operation(summary = "Presigned URL 발급", description = "프로필 이미지 업로드를 위한 MinIO presigned URL을 발급합니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "URL 발급 성공"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "허용되지 않는 파일 형식"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "URL 생성 실패")
  })
  @PostMapping("/presigned-url")
  public ApiResponse<PresignedUrlResponse> getPresignedUrl(
      @Valid @RequestBody PresignedUrlRequest request) {
    Long userId = authenticatedUserProvider.getCurrentUserId();
    return ApiResponse.success(fileStorageService.generatePresignedUrl(userId, request));
  }
}
