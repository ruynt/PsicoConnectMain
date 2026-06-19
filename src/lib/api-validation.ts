import { NextResponse } from "next/server";
import { z } from "zod";

function getValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message || "Dados inválidos.";
}

export async function parseJsonBody<TSchema extends z.ZodType>(
  req: Request,
  schema: TSchema,
): Promise<
  | {
      data: z.infer<TSchema>;
      error: null;
    }
  | {
      data: null;
      error: NextResponse;
    }
> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        { error: "Envie um corpo JSON válido." },
        { status: 400 },
      ),
    };
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      data: null,
      error: NextResponse.json(
        { error: getValidationMessage(parsed.error) },
        { status: 400 },
      ),
    };
  }

  return {
    data: parsed.data,
    error: null,
  };
}

export function requiredTrimmedString(
  maxLength: number,
  requiredMessage: string,
  maxLengthMessage: string,
) {
  return z
    .custom<string>(
      (value) => typeof value === "string" && value.trim().length > 0,
      { message: requiredMessage },
    )
    .transform((value) => value.trim())
    .pipe(z.string().max(maxLength, maxLengthMessage));
}

export function optionalTrimmedString(maxLength: number, maxLengthMessage: string) {
  return z
    .preprocess((value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();

      return trimmed || undefined;
    }, z.string().max(maxLength, maxLengthMessage).optional())
    .transform((value) => value ?? null);
}

export function requiredUuidString(
  requiredMessage: string,
  invalidMessage: string,
) {
  return z
    .custom<string>(
      (value) => typeof value === "string" && value.trim().length > 0,
      { message: requiredMessage },
    )
    .transform((value) => value.trim())
    .pipe(z.string().uuid(invalidMessage));
}

export function optionalUuidString(invalidMessage: string) {
  return z
    .preprocess((value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();

      return trimmed || undefined;
    }, z.string().uuid(invalidMessage).optional())
    .transform((value) => value ?? null);
}

export function optionalScaleNumber(invalidMessage: string) {
  return z
    .preprocess((value) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      return Number(value);
    }, z.number().min(0, invalidMessage).max(10, invalidMessage).nullable().optional())
    .transform((value) => value ?? null);
}
