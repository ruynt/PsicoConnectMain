const DEFAULT_RATE_LIMIT_MESSAGE =
  "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";

type ApiErrorPayload = {
  error?: unknown;
  message?: unknown;
};

function getRetryAfterMessage(response: Response) {
  const retryAfterHeader = response.headers.get("Retry-After");
  const retryAfterSeconds = Number(retryAfterHeader);

  if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) {
    return "";
  }

  if (retryAfterSeconds < 60) {
    return ` Aguarde cerca de ${Math.ceil(retryAfterSeconds)} segundo(s).`;
  }

  return ` Aguarde cerca de ${Math.ceil(retryAfterSeconds / 60)} minuto(s).`;
}

export function getRateLimitMessage(response?: Response) {
  return `${DEFAULT_RATE_LIMIT_MESSAGE}${response ? getRetryAfterMessage(response) : ""}`;
}

export async function readApiErrorMessage(
  response: Response,
  fallbackMessage: string,
) {
  if (response.status === 429) {
    return getRateLimitMessage(response);
  }

  const data = (await response.json().catch(() => null)) as ApiErrorPayload | null;

  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error;
  }

  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }

  return fallbackMessage;
}
