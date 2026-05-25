/** 业务成功码 */
export const API_SUCCESS_CODE = 0;

export interface ApiResponse<T = unknown> {
  /** 业务状态码，0 表示成功 */
  code: number;
  message: string;
  data: T;
  /** 本次 HTTP 状态码 */
  status: number;
  timestamp: string;
  path: string;
}

export function buildSuccessResponse<T>(
  data: T,
  status: number,
  path: string,
  message = 'success',
): ApiResponse<T> {
  return {
    code: API_SUCCESS_CODE,
    message,
    data: (data ?? null) as T,
    status,
    timestamp: new Date().toISOString(),
    path,
  };
}

export function buildErrorResponse(
  status: number,
  message: string,
  path: string,
): ApiResponse<null> {
  return {
    code: status,
    message,
    data: null,
    status,
    timestamp: new Date().toISOString(),
    path,
  };
}

export function isApiResponse(value: unknown): value is ApiResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const body = value as Record<string, unknown>;
  return (
    typeof body.code === 'number' &&
    typeof body.message === 'string' &&
    'data' in body &&
    typeof body.status === 'number'
  );
}
