import type { Prisma, Role } from "@prisma/client";

import prisma from "@/lib/prisma";

type AuditMetadata = Record<string, unknown>;

export type AuditLogInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  actorRole?: Role | string | null;
  targetUserId?: string | null;
  request?: Request | null;
  metadata?: AuditMetadata | null;
};

const SENSITIVE_KEY_PATTERN =
  /password|senha|token|secret|cookie|authorization|accessToken|refreshToken|googleAccessToken|googleRefreshToken/i;

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[MaxDepth]";
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const sanitized: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        sanitized[key] = "[REDACTED]";
        continue;
      }

      sanitized[key] = sanitizeValue(nestedValue, depth + 1);
    }

    return sanitized;
  }

  return String(value);
}

function sanitizeMetadata(metadata?: AuditMetadata | null) {
  if (!metadata) {
    return undefined;
  }

  return sanitizeValue(metadata) as Prisma.InputJsonValue;
}

function getHeader(request: Request | null | undefined, name: string) {
  return request?.headers.get(name) || null;
}

function getClientIp(request: Request | null | undefined) {
  const forwardedFor = getHeader(request, "x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return (
    getHeader(request, "x-real-ip") ||
    getHeader(request, "cf-connecting-ip") ||
    null
  );
}

function normalizeRole(role: AuditLogInput["actorRole"]): Role | undefined {
  if (role === "ADMIN" || role === "PSYCHOLOGIST" || role === "PATIENT") {
    return role;
  }

  return undefined;
}

export async function logAuditEvent(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        actorUserId: input.actorUserId || null,
        actorRole: normalizeRole(input.actorRole),
        targetUserId: input.targetUserId || null,
        ipAddress: getClientIp(input.request),
        userAgent: getHeader(input.request, "user-agent"),
        metadata: sanitizeMetadata(input.metadata),
      },
    });
  } catch (error) {
    console.error("Erro ao registrar auditoria:", error);
  }
}
