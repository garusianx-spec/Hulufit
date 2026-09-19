/** Errors that are safe to surface to a client, with a stable machine code. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(code: string, message: string, details?: unknown) {
    return new ApiError(400, code, message, details);
  }
  static unauthorized(message = "احراز هویت لازم است.") {
    return new ApiError(401, "unauthorized", message);
  }
  static forbidden(message = "برای این عملیات دسترسی ندارید.") {
    return new ApiError(403, "forbidden", message);
  }
  static notFound(message = "یافت نشد.") {
    return new ApiError(404, "not_found", message);
  }
  static payloadTooLarge(message: string, details?: unknown) {
    return new ApiError(413, "payload_too_large", message, details);
  }
  static unsupportedMedia(message: string, details?: unknown) {
    return new ApiError(415, "unsupported_media_type", message, details);
  }
  /** `retryAfter` is in seconds and is echoed as a `Retry-After` header. */
  static tooManyRequests(message: string, retryAfter: number) {
    return new ApiError(429, "rate_limited", message, { retryAfter });
  }
}

export function toErrorBody(error: unknown) {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message, details: error.details } },
    };
  }
  return {
    status: 500,
    body: { error: { code: "internal_error", message: "خطای داخلی سرور." } },
  };
}
