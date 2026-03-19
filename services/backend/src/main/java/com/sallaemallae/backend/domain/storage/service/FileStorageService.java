package com.sallaemallae.backend.domain.storage.service;

import com.sallaemallae.backend.domain.storage.dto.PresignedUrlRequest;
import com.sallaemallae.backend.domain.storage.dto.PresignedUrlResponse;
import com.sallaemallae.backend.domain.storage.exception.StorageErrorCode;
import com.sallaemallae.backend.global.exception.BusinessException;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.http.Method;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FileStorageService {

  private final MinioClient minioClient;

  @Value("${minio.bucket}")
  private String bucket;

  @Value("${minio.public-url}")
  private String publicUrl;

  private static final Set<String> ALLOWED_TYPES = Set.of(
      "image/jpeg", "image/png", "image/gif", "image/webp"
  );

  private static final int PRESIGNED_EXPIRY_MINUTES = 10;

  public PresignedUrlResponse generatePresignedUrl(Long userId, PresignedUrlRequest request) {
    if (!ALLOWED_TYPES.contains(request.contentType())) {
      throw new BusinessException(StorageErrorCode.INVALID_FILE_TYPE);
    }

    String ext = extractExtension(request.fileName());
    String objectKey = "profiles/" + userId + "/" + UUID.randomUUID() + "." + ext;

    try {
      String uploadUrl = minioClient.getPresignedObjectUrl(
          GetPresignedObjectUrlArgs.builder()
              .method(Method.PUT)
              .bucket(bucket)
              .object(objectKey)
              .expiry(PRESIGNED_EXPIRY_MINUTES, TimeUnit.MINUTES)
              .build()
      );

      String fileUrl = publicUrl + "/" + bucket + "/" + objectKey;

      return new PresignedUrlResponse(uploadUrl, fileUrl);
    } catch (Exception e) {
      throw new BusinessException(StorageErrorCode.PRESIGNED_URL_FAILED);
    }
  }

  private String extractExtension(String fileName) {
    int dotIndex = fileName.lastIndexOf('.');
    if (dotIndex == -1 || dotIndex == fileName.length() - 1) {
      return "bin";
    }
    return fileName.substring(dotIndex + 1).toLowerCase();
  }
}
