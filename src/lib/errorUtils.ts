type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

export function getErrorMessage(
  error: unknown,
  fallback = "Ocorreu um erro inesperado.",
) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (isRecord(error)) {
    const message = error.message;

    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}

export function getErrorCode(error: unknown) {
  if (isRecord(error)) {
    const code = error.code;

    if (typeof code === "string") {
      return code;
    }
  }

  return null;
}

export function getExternalApiErrorMessage(
  payload: unknown,
  fallback = "Erro ao se comunicar com serviço externo.",
) {
  if (!isRecord(payload)) {
    return fallback;
  }

  const directMessage = payload.message;
  const errorDescription = payload.error_description;
  const error = payload.error;

  if (typeof directMessage === "string" && directMessage.trim().length > 0) {
    return directMessage;
  }

  if (
    typeof errorDescription === "string" &&
    errorDescription.trim().length > 0
  ) {
    return errorDescription;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (isRecord(error)) {
    const nestedMessage = error.message;

    if (
      typeof nestedMessage === "string" &&
      nestedMessage.trim().length > 0
    ) {
      return nestedMessage;
    }
  }

  return fallback;
}
