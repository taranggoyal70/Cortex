export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  console.error("Unhandled request error", error);
  return Response.json(
    {
      error: {
        code: "internal_error",
        message: "Something went wrong. Please try again.",
      },
    },
    { status: 500 },
  );
}
