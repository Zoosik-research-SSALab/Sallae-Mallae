/**
 * 백엔드 ApiResponse<T> 공통 응답 구조 대응 유틸리티.
 *
 * 백엔드 응답 형태:
 * - 성공 (데이터 있음): { success: true, data: T, error: null }
 * - 성공 (데이터 없음): { success: true, data: null, error: null }
 * - 실패: { success: false, data: null, error: { code: string, message: string } }
 */

export type ApiErrorResponse = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: ApiErrorResponse | null;
};

/**
 * 백엔드 응답이 ApiResponse envelope인지 확인합니다.
 */
export function isApiEnvelope(response: unknown): response is ApiResponse<unknown> {
  return (
    typeof response === "object" &&
    response !== null &&
    "success" in response &&
    "data" in response
  );
}

/**
 * ApiResponse envelope을 unwrap하여 data를 반환합니다.
 * envelope이 아니면 응답을 그대로 반환합니다.
 *
 * @throws ApiResponseError 백엔드가 success: false를 반환한 경우
 */
export function unwrapApiResponse<T = unknown>(response: unknown): T {
  if (!isApiEnvelope(response)) {
    return response as T;
  }

  if (!response.success && response.error) {
    throw new ApiResponseError(response.error.code, response.error.message);
  }

  return response.data as T;
}

/**
 * 백엔드 ApiResponse 에러를 나타내는 에러 클래스.
 */
export class ApiResponseError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiResponseError";
    this.code = code;
  }
}
