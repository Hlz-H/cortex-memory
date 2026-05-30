export class CortexError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string = 'INTERNAL_ERROR', statusCode: number = 500) {
    super(message);
    this.name = 'CortexError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends CortexError {
  public readonly field?: string;

  constructor(fieldOrMessage: string, message?: string) {
    const field = message ? fieldOrMessage : undefined;
    const msg = message ? `Validation failed: ${fieldOrMessage} - ${message}` : fieldOrMessage;
    super(msg, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    if (field) this.field = field;
  }
}

export class NotFoundError extends CortexError {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` (${id})` : ''} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends CortexError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class OllamaError extends CortexError {
  constructor(message: string) {
    super(message, 'OLLAMA_ERROR', 503);
    this.name = 'OllamaError';
  }
}

export function isCortexError(error: unknown): error is CortexError {
  return error instanceof CortexError;
}
