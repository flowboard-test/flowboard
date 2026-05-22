export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(code: string, message: string, details?: Record<string, unknown>) {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(code: string, message: string, details?: Record<string, unknown>) {
    return new AppError(403, code, message, details);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(code: string, message: string, details?: Record<string, unknown>) {
    return new AppError(409, code, message, details);
  }

  static unprocessable(code: string, message: string, details?: Record<string, unknown>) {
    return new AppError(422, code, message, details);
  }
}
