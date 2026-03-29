package com.sallaemallae.backend.domain.storage.service;

import com.google.common.collect.HashMultimap;
import com.google.common.collect.Multimap;
import com.sallaemallae.backend.domain.storage.dto.request.PresignedUrlRequest;
import com.sallaemallae.backend.domain.storage.dto.response.PresignedUrlResponse;
import com.sallaemallae.backend.domain.storage.exception.StorageErrorCode;
import com.sallaemallae.backend.global.exception.BusinessException;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.http.Method;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class FileStorageService {

  private final MinioClient minioClient;
  private final MinioClient presignedMinioClient;

  public FileStorageService(
      MinioClient minioClient,
      @Qualifier("presignedMinioClient") MinioClient presignedMinioClient) {
    this.minioClient = minioClient;
    this.presignedMinioClient = presignedMinioClient;
  }

  @Value("${minio.bucket}")
  private String bucket;

  @Value("${minio.public-url}")
  private String publicUrl;

  private static final Set<String> ALLOWED_TYPES = Set.of(
      "image/jpeg", "image/png", "image/gif", "image/webp"
  );

  private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
      "jpg", "jpeg", "png", "gif", "webp"
  );

  private static final int PRESIGNED_EXPIRY_MINUTES = 10;
  private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

  public PresignedUrlResponse generatePresignedUrl(Long userId, PresignedUrlRequest request) {
    if (!ALLOWED_TYPES.contains(request.contentType())) {
      throw new BusinessException(StorageErrorCode.INVALID_FILE_TYPE);
    }

    String ext = extractExtension(request.fileName());
    if (!ALLOWED_EXTENSIONS.contains(ext)) {
      throw new BusinessException(StorageErrorCode.INVALID_FILE_TYPE);
    }

    if (request.fileSize() > MAX_FILE_SIZE) {
      throw new BusinessException(StorageErrorCode.FILE_TOO_LARGE);
    }

    String objectKey = "profiles/" + userId + "/" + UUID.randomUUID() + "." + ext;

    try {
      Multimap<String, String> headers = HashMultimap.create();
      headers.put("Content-Type", request.contentType());

      // 외부 호스트 기준으로 서명 — nginx 프록시 경유 시 Host 헤더와 일치
      // region 명시로 내부 네트워크 조회 생략
      String uploadUrl = presignedMinioClient.getPresignedObjectUrl(
          GetPresignedObjectUrlArgs.builder()
              .method(Method.PUT)
              .bucket(bucket)
              .object(objectKey)
              .region("us-east-1")
              .expiry(PRESIGNED_EXPIRY_MINUTES, TimeUnit.MINUTES)
              .extraHeaders(headers)
              .build()
      );

      String fileUrl = normalizeUrl(publicUrl) + "/" + objectKey;

      return new PresignedUrlResponse(uploadUrl, fileUrl);
    } catch (Exception e) {
      log.error("Presigned URL 생성 실패: userId={}, bucket={}", userId, bucket, e);
      throw new BusinessException(StorageErrorCode.PRESIGNED_URL_FAILED);
    }
  }

  public boolean verifyObjectExists(String fileUrl) {
    String objectKey = extractObjectKey(fileUrl);
    if (objectKey == null) {
      return false;
    }
    try {
      minioClient.statObject(
          StatObjectArgs.builder()
              .bucket(bucket)
              .object(objectKey)
              .build()
      );
      return true;
    } catch (Exception e) {
      return false;
    }
  }

  public void deleteObject(String fileUrl) {
    String objectKey = extractObjectKey(fileUrl);
    if (objectKey == null) {
      return;
    }
    try {
      minioClient.removeObject(
          RemoveObjectArgs.builder()
              .bucket(bucket)
              .object(objectKey)
              .build()
      );
    } catch (Exception e) {
      log.warn("이전 프로필 이미지 삭제 실패: fileUrl={}", fileUrl, e);
    }
  }

  public boolean isMinioUrl(String url) {
    return url != null && url.startsWith(normalizeUrl(publicUrl) + "/");
  }

  private String extractObjectKey(String fileUrl) {
    String prefix = normalizeUrl(publicUrl) + "/";
    if (fileUrl == null || !fileUrl.startsWith(prefix)) {
      return null;
    }
    return fileUrl.substring(prefix.length());
  }

  private String normalizeUrl(String url) {
    return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
  }

  private String extractExtension(String fileName) {
    int dotIndex = fileName.lastIndexOf('.');
    if (dotIndex == -1 || dotIndex == fileName.length() - 1) {
      return "bin";
    }
    return fileName.substring(dotIndex + 1).toLowerCase();
  }
}
