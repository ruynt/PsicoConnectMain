import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authConfig);
  const role = (session?.user as { role?: string } | undefined)?.role;

  return role === "ADMIN";
}

export async function GET() {
  try {
    const isAdmin = await requireAdmin();

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Acesso restrito a administradores." },
        { status: 403 },
      );
    }

    const psychologistRoleFilter = {
      user: {
        role: "PSYCHOLOGIST" as const,
      },
    };

    const [
      totalUsers,
      totalPatients,
      totalPsychologists,
      pendingPsychologists,
      approvedPsychologists,
      rejectedPsychologists,
      psychologists,
    ] = await Promise.all([
      prisma.user.count(),

      prisma.patient.count(),

      prisma.psychologist.count({
        where: psychologistRoleFilter,
      }),

      prisma.psychologist.count({
        where: {
          ...psychologistRoleFilter,
          crpVerificationStatus: "PENDING",
        },
      }),

      prisma.psychologist.count({
        where: {
          ...psychologistRoleFilter,
          crpVerificationStatus: "APPROVED",
        },
      }),

      prisma.psychologist.count({
        where: {
          ...psychologistRoleFilter,
          crpVerificationStatus: "REJECTED",
        },
      }),

      prisma.psychologist.findMany({
        where: psychologistRoleFilter,
        orderBy: [
          { crpVerificationStatus: "asc" },
          { user: { createdAt: "desc" } },
        ],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
              emailVerified: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalPatients,
        totalPsychologists,
        pendingPsychologists,
        approvedPsychologists,
        rejectedPsychologists,
      },

      psychologists: psychologists.map((psychologist) => ({
        id: psychologist.id,

        // CRP completo salvo no banco, ex: 13/123456
        crp: psychologist.crp,

        // Novos campos para conferência administrativa
        crpState: psychologist.crpState || null,
        crpRegion: psychologist.crpRegion || null,
        crpNumber: psychologist.crpNumber || null,
        crpRejectedAt: psychologist.crpRejectedAt?.toISOString() || null,
        crpRejectionReason: psychologist.crpRejectionReason || null,


        crpVerificationStatus: psychologist.crpVerificationStatus,
        crpVerifiedAt: psychologist.crpVerifiedAt?.toISOString() || null,
        createdAt: psychologist.user.createdAt.toISOString(),

        user: {
          id: psychologist.user.id,
          name: psychologist.user.name,
          email: psychologist.user.email,
          role: psychologist.user.role,
          createdAt: psychologist.user.createdAt.toISOString(),
          emailVerified: psychologist.user.emailVerified?.toISOString() || null,
        },
      })),
    });
  } catch (error) {
    console.error("Erro ao carregar administração:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os dados administrativos." },
      { status: 500 },
    );
  }
}