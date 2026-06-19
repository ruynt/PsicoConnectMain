import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma, Role } from "@prisma/client";

import { authConfig } from "@/lib/auth";
import prisma from "@/lib/prisma";

const validRoles: Role[] = ["ADMIN", "PSYCHOLOGIST", "PATIENT"];

const MAX_TAKE = 100;
const DEFAULT_TAKE = 50;

async function requireAdmin() {
  const session = await getServerSession(authConfig);
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (user?.role !== "ADMIN") {
    return null;
  }

  return {
    userId: user.id || null,
  };
}

function normalizeTextParam(value: string | null, maxLength = 120) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeTake(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TAKE;
  }

  return Math.min(Math.floor(parsed), MAX_TAKE);
}

function normalizeRole(value: string | null): Role | null {
  if (validRoles.includes(value as Role)) {
    return value as Role;
  }

  return null;
}

function buildAuditWhere(searchParams: URLSearchParams): Prisma.AuditLogWhereInput {
  const search = normalizeTextParam(searchParams.get("search"));
  const action = normalizeTextParam(searchParams.get("action"), 80).toUpperCase();
  const entityType = normalizeTextParam(searchParams.get("entityType"), 80);
  const actorRole = normalizeRole(searchParams.get("actorRole"));

  const where: Prisma.AuditLogWhereInput = {};
  const andFilters: Prisma.AuditLogWhereInput[] = [];

  if (action) {
    andFilters.push({ action: { contains: action, mode: "insensitive" } });
  }

  if (entityType) {
    andFilters.push({ entityType: { contains: entityType, mode: "insensitive" } });
  }

  if (actorRole) {
    andFilters.push({ actorRole });
  }

  if (search) {
    andFilters.push({
      OR: [
        { action: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
        { actorUserId: { contains: search, mode: "insensitive" } },
        { targetUserId: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  return where;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Acesso restrito a administradores." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const take = normalizeTake(searchParams.get("take"));
    const where = buildAuditWhere(searchParams);
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, last24h, logs, actionOptions, entityOptions] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: last24Hours,
          },
        },
      }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.auditLog.findMany({
        distinct: ["action"],
        orderBy: { action: "asc" },
        select: { action: true },
        take: 200,
      }),
      prisma.auditLog.findMany({
        distinct: ["entityType"],
        orderBy: { entityType: "asc" },
        select: { entityType: true },
        take: 100,
      }),
    ]);

    const userIds = Array.from(
      new Set(
        logs
          .flatMap((log) => [log.actorUserId, log.targetUserId])
          .filter((userId): userId is string => Boolean(userId)),
      ),
    );

    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        })
      : [];

    const usersById = new Map(users.map((user) => [user.id, user]));

    return NextResponse.json({
      stats: {
        total,
        last24h,
        returned: logs.length,
      },
      options: {
        actions: actionOptions.map((item) => item.action),
        entityTypes: entityOptions.map((item) => item.entityType),
      },
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actorUserId: log.actorUserId,
        actorRole: log.actorRole,
        actorUser: log.actorUserId ? usersById.get(log.actorUserId) || null : null,
        targetUserId: log.targetUserId,
        targetUser: log.targetUserId ? usersById.get(log.targetUserId) || null : null,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Erro ao carregar auditoria:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os registros de auditoria." },
      { status: 500 },
    );
  }
}
