import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authConfig } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";
import {
  isPasswordLongEnough,
  PASSWORD_MIN_LENGTH_MESSAGE,
} from "../../../../../lib/password-policy";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AdminSession = {
  user?: {
    id?: string;
    role?: string;
  };
};

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres.")
    .max(120, "Nome deve ter no máximo 120 caracteres."),
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .max(180, "E-mail deve ter no máximo 180 caracteres."),
  role: z.enum(["ADMIN", "PSYCHOLOGIST", "PATIENT"]),
  emailVerified: z.boolean(),
  password: z.string().max(120).optional(),
  crpState: z.string().max(10).optional(),
  crpRegion: z.string().max(10).optional(),
  crpNumber: z.string().max(30).optional(),
  crpVerificationStatus: z
    .enum(["PENDING", "APPROVED", "REJECTED"])
    .optional(),
});

async function requireAdmin() {
  const session = (await getServerSession(authConfig)) as AdminSession | null;

  if (session?.user?.role !== "ADMIN") {
    return null;
  }

  return {
    userId: session.user.id || null,
  };
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeCrpParts(data: {
  crpState?: string;
  crpRegion?: string;
  crpNumber?: string;
}) {
  const crpState = String(data.crpState || "")
    .trim()
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
  const crpRegion = onlyDigits(String(data.crpRegion || "")).slice(0, 2);
  const crpNumber = onlyDigits(String(data.crpNumber || "")).slice(0, 12);

  if (!/^[A-Z]{2}$/.test(crpState) || !crpRegion || !crpNumber) {
    throw new Error("INVALID_CRP_DATA");
  }

  return {
    crpState,
    crpRegion,
    crpNumber,
    crp: `${crpRegion}/${crpNumber}`,
  };
}

async function ensureAdminCanChangeRole(targetUserId: string, newRole: string) {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!targetUser) {
    return;
  }

  if (targetUser.role === "ADMIN" && newRole !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });

    if (adminCount <= 1) {
      throw new Error("LAST_ADMIN_ROLE_CHANGE");
    }
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Acesso restrito a administradores." },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const data = schema.parse(body);

    if (!id) {
      return NextResponse.json(
        { error: "Usuário inválido." },
        { status: 400 },
      );
    }

    if (admin.userId === id && data.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Você não pode remover seu próprio acesso administrativo." },
        { status: 400 },
      );
    }

    if (data.password && !isPasswordLongEnough(data.password)) {
      return NextResponse.json(
        { error: PASSWORD_MIN_LENGTH_MESSAGE },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        patient: true,
        psychologist: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 },
      );
    }

    await ensureAdminCanChangeRole(id, data.role);

    const normalizedEmail = data.email.trim().toLowerCase();

    const emailOwner = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (emailOwner && emailOwner.id !== id) {
      return NextResponse.json(
        { error: "Este e-mail já está em uso por outro usuário." },
        { status: 409 },
      );
    }

    let crpData: ReturnType<typeof normalizeCrpParts> | null = null;

    if (data.role === "PSYCHOLOGIST") {
      crpData = normalizeCrpParts({
        crpState: data.crpState,
        crpRegion: data.crpRegion,
        crpNumber: data.crpNumber,
      });

      const crpOwner = await prisma.psychologist.findUnique({
        where: { crp: crpData.crp },
        select: { userId: true },
      });

      if (crpOwner && crpOwner.userId !== id) {
        return NextResponse.json(
          { error: "Este CRP já está vinculado a outro usuário." },
          { status: 409 },
        );
      }
    }

    const passwordHash = data.password
      ? await bcrypt.hash(data.password, 10)
      : undefined;

    const emailVerified = data.emailVerified
      ? user.emailVerified || new Date()
      : null;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          name: data.name.trim(),
          email: normalizedEmail,
          role: data.role,
          emailVerified,
          ...(passwordHash ? { passwordHash } : {}),
        },
      });

      if (data.role === "PATIENT" && !user.patient) {
        await tx.patient.create({
          data: { userId: id },
        });
      }

      if (data.role === "PSYCHOLOGIST" && crpData) {
        const verificationStatus = data.crpVerificationStatus || "PENDING";
        const crpVerifiedAt =
          verificationStatus === "APPROVED"
            ? user.psychologist?.crpVerifiedAt || new Date()
            : null;

        if (user.psychologist) {
          await tx.psychologist.update({
            where: { id: user.psychologist.id },
            data: {
              crp: crpData.crp,
              crpState: crpData.crpState,
              crpRegion: crpData.crpRegion,
              crpNumber: crpData.crpNumber,
              crpVerificationStatus: verificationStatus,
              crpVerifiedAt,
              crpRejectedAt:
                verificationStatus === "REJECTED"
                  ? user.psychologist.crpRejectedAt || new Date()
                  : null,
              crpRejectionReason:
                verificationStatus === "REJECTED"
                  ? user.psychologist.crpRejectionReason
                  : null,
            },
          });
        } else {
          await tx.psychologist.create({
            data: {
              userId: id,
              crp: crpData.crp,
              crpState: crpData.crpState,
              crpRegion: crpData.crpRegion,
              crpNumber: crpData.crpNumber,
              crpVerificationStatus: verificationStatus,
              crpVerifiedAt,
              crpRejectedAt: verificationStatus === "REJECTED" ? new Date() : null,
            },
          });
        }
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Usuário atualizado com sucesso.",
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos.",
          details: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INVALID_CRP_DATA") {
      return NextResponse.json(
        { error: "Informe estado, regional e número do CRP." },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "LAST_ADMIN_ROLE_CHANGE") {
      return NextResponse.json(
        { error: "Não é possível remover o acesso do último administrador." },
        { status: 400 },
      );
    }

    console.error("Erro ao editar usuário:", error);

    return NextResponse.json(
      { error: "Não foi possível editar o usuário." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  void req;

  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Acesso restrito a administradores." },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Usuário inválido." },
        { status: 400 },
      );
    }

    if (admin.userId === id) {
      return NextResponse.json(
        { error: "Você não pode excluir a própria conta administrativa." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true },
        },
        psychologist: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 },
      );
    }

    if (user.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Não é possível excluir o último administrador." },
          { status: 400 },
        );
      }
    }

    const patientId = user.patient?.id || null;
    const psychologistId = user.psychologist?.id || null;

    await prisma.$transaction(async (tx) => {
      if (patientId) {
        await tx.patientMessage.deleteMany({ where: { patientId } });
        await tx.patientSummary.deleteMany({ where: { patientId } });
        await tx.patientMaterial.deleteMany({ where: { patientId } });
        await tx.therapeuticTask.deleteMany({ where: { patientId } });
        await tx.preSessionCheckin.deleteMany({ where: { patientId } });
        await tx.sessionNote.deleteMany({ where: { patientId } });
        await tx.psychologistPatient.deleteMany({ where: { patientId } });
        await tx.appointment.deleteMany({ where: { patientId } });
        await tx.patient.delete({ where: { id: patientId } });
      }

      if (psychologistId) {
        await tx.patientMessage.deleteMany({ where: { psychologistId } });
        await tx.patientSummary.deleteMany({ where: { psychologistId } });
        await tx.patientMaterial.deleteMany({ where: { psychologistId } });
        await tx.therapeuticTask.deleteMany({ where: { psychologistId } });

        await tx.preSessionCheckin.deleteMany({
          where: {
            appointment: {
              psychologistId,
            },
          },
        });

        await tx.sessionNote.deleteMany({ where: { psychologistId } });
        await tx.psychologistPatient.deleteMany({ where: { psychologistId } });
        await tx.appointment.deleteMany({ where: { psychologistId } });
        await tx.psychologist.delete({ where: { id: psychologistId } });
      }

      await tx.verificationToken.deleteMany({
        where: { email: user.email },
      });

      await tx.passwordResetToken.deleteMany({
        where: { email: user.email },
      });

      await tx.user.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      ok: true,
      message: "Usuário excluído com sucesso.",
    });
  } catch (error: unknown) {
    console.error("Erro ao excluir usuário:", error);

    return NextResponse.json(
      { error: "Não foi possível excluir o usuário." },
      { status: 500 },
    );
  }
}
