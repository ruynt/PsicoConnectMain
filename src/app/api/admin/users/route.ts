import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import type { CrpVerificationStatus, Prisma, Role } from "@prisma/client";

import { authConfig } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";

const validRoles: Role[] = ["ADMIN", "PSYCHOLOGIST", "PATIENT"];

const validCrpStatuses: CrpVerificationStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
];

async function requireAdmin() {
  const session = await getServerSession(authConfig);
  const role = (session?.user as { role?: string } | undefined)?.role;

  return role === "ADMIN";
}

function isValidRole(value: string): value is Role {
  return validRoles.includes(value as Role);
}

function isValidCrpStatus(value: string): value is CrpVerificationStatus {
  return validCrpStatuses.includes(value as CrpVerificationStatus);
}

function normalizeSearch(value: string | null) {
  return String(value || "").trim().slice(0, 120);
}

export async function GET(req: NextRequest) {
  try {
    const isAdmin = await requireAdmin();

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Acesso restrito a administradores." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const search = normalizeSearch(searchParams.get("search"));
    const role = searchParams.get("role") || "ALL";
    const crpStatus = searchParams.get("crpStatus") || "ALL";

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        {
          psychologist: {
            crp: { contains: search, mode: "insensitive" },
          },
        },
        {
          psychologist: {
            crpState: { contains: search, mode: "insensitive" },
          },
        },
        {
          psychologist: {
            crpRegion: { contains: search, mode: "insensitive" },
          },
        },
        {
          psychologist: {
            crpNumber: { contains: search, mode: "insensitive" },
          },
        },
        {
          psychologist: {
            crpRejectionReason: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    if (isValidRole(role)) {
      where.role = role;
    }

    if (isValidCrpStatus(crpStatus)) {
      where.role = "PSYCHOLOGIST";
      where.psychologist = {
        crpVerificationStatus: crpStatus,
      };
    }

    const [totalUsers, adminUsers, psychologistUsers, patientUsers, users] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "ADMIN" } }),
        prisma.user.count({ where: { role: "PSYCHOLOGIST" } }),
        prisma.user.count({ where: { role: "PATIENT" } }),
        prisma.user.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            emailVerified: true,
            patient: {
              select: {
                id: true,
              },
            },
            psychologist: {
              select: {
                id: true,
                crp: true,
                crpState: true,
                crpRegion: true,
                crpNumber: true,
                crpVerificationStatus: true,
                crpVerifiedAt: true,
                crpRejectedAt: true,
                crpRejectionReason: true,
              },
            },
          },
        }),
      ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        adminUsers,
        psychologistUsers,
        patientUsers,
      },
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        emailVerified: user.emailVerified?.toISOString() || null,
        patient: user.patient,
        psychologist:
          user.role === "PSYCHOLOGIST" && user.psychologist
            ? {
                id: user.psychologist.id,
                crp: user.psychologist.crp,
                crpState: user.psychologist.crpState || null,
                crpRegion: user.psychologist.crpRegion || null,
                crpNumber: user.psychologist.crpNumber || null,
                crpVerificationStatus: user.psychologist.crpVerificationStatus,
                crpVerifiedAt:
                  user.psychologist.crpVerifiedAt?.toISOString() || null,
                crpRejectedAt:
                  user.psychologist.crpRejectedAt?.toISOString() || null,
                crpRejectionReason:
                  user.psychologist.crpRejectionReason || null,
              }
            : null,
      })),
    });
  } catch (error: unknown) {
    console.error("Erro ao carregar usuários administrativos:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os usuários." },
      { status: 500 },
    );
  }
}
