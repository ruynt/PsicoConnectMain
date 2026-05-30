import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authConfig } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const schema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres."),
  email: z.string().email("E-mail inválido."),
  role: z.enum(["ADMIN", "PSYCHOLOGIST", "PATIENT"]),
  emailVerified: z.boolean(),
  password: z.string().optional(),
  crpState: z.string().optional(),
  crpRegion: z.string().optional(),
  crpNumber: z.string().optional(),
  crpVerificationStatus: z
    .enum(["PENDING", "APPROVED", "REJECTED"])
    .optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authConfig);
  const role = (session?.user as { role?: string } | undefined)?.role;

  return role === "ADMIN";
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeCrpParts(data: {
  crpState?: string;
  crpRegion?: string;
  crpNumber?: string;
}) {
  const crpState = String(data.crpState || "").trim().toUpperCase();
  const crpRegion = onlyDigits(String(data.crpRegion || "")).slice(0, 2);
  const crpNumber = onlyDigits(String(data.crpNumber || ""));

  if (!crpState || !crpRegion || !crpNumber) {
    throw new Error("INVALID_CRP_DATA");
  }

  return {
    crpState,
    crpRegion,
    crpNumber,
    crp: `${crpRegion}/${crpNumber}`,
  };
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const isAdmin = await requireAdmin();

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Acesso restrito a administradores." },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const data = schema.parse(body);

    if (!id) {
      return NextResponse.json(
        { error: "Usuário inválido." },
        { status: 400 },
      );
    }

    if (data.password && data.password.length < 8) {
      return NextResponse.json(
        { error: "A nova senha deve ter pelo menos 8 caracteres." },
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

        if (user.psychologist) {
          await tx.psychologist.update({
            where: { id: user.psychologist.id },
            data: {
              crp: crpData.crp,
              crpState: crpData.crpState,
              crpRegion: crpData.crpRegion,
              crpNumber: crpData.crpNumber,
              crpVerificationStatus: verificationStatus,
              crpVerifiedAt:
                verificationStatus === "APPROVED"
                  ? user.psychologist.crpVerifiedAt || new Date()
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
              crpVerifiedAt:
                verificationStatus === "APPROVED" ? new Date() : null,
            },
          });
        }
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Usuário atualizado com sucesso.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos.",
          details: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (error?.message === "INVALID_CRP_DATA") {
      return NextResponse.json(
        { error: "Informe estado, regional e número do CRP." },
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
