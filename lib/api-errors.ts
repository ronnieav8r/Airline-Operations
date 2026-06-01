import { NextResponse } from "next/server";

export type ApiErrorBody = {
  error: string;
  details?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown): ApiError {
  return new ApiError(400, message, details);
}

export function notFound(message: string, details?: unknown): ApiError {
  return new ApiError(404, message, details);
}

export function parseIsoDate(
  value: string,
  errorMessage = "Invalid date. Expected ISO date string.",
): Date {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw badRequest(errorMessage, { value });
  }

  return parsed;
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function handleApiError(
  error: unknown,
  fallbackMessage = "Internal server error.",
): NextResponse<ApiErrorBody> {
  if (isApiError(error)) {
    return NextResponse.json(
      error.details === undefined
        ? { error: error.message }
        : { error: error.message, details: error.details },
      { status: error.status },
    );
  }

  console.error(error);

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
