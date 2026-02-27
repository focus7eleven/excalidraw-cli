export class ExcalidrawCLIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ExcalidrawCLIError";
  }
}

export class InputError extends ExcalidrawCLIError {
  constructor(message: string, cause?: unknown) {
    super(message, "INPUT_ERROR", cause);
    this.name = "InputError";
  }
}

export class ValidationError extends ExcalidrawCLIError {
  constructor(message: string, cause?: unknown) {
    super(message, "VALIDATION_ERROR", cause);
    this.name = "ValidationError";
  }
}

export class RenderError extends ExcalidrawCLIError {
  constructor(message: string, cause?: unknown) {
    super(message, "RENDER_ERROR", cause);
    this.name = "RenderError";
  }
}

export class FontError extends ExcalidrawCLIError {
  constructor(message: string, cause?: unknown) {
    super(message, "FONT_ERROR", cause);
    this.name = "FontError";
  }
}
