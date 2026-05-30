import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

type SessionUser = {
  id?: string;
  email?: string | null;
  role?: string;
};

const validStates = new Set([
  "AC",
  "AL",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RS",
  "SC",
  "SE",
  "SP",
]);

function normalizeName(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeState(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function normalizeDigits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function buildCrp(region: string, number: string) {
  return `${region}/${number}`;
}

function serializeDate(date: Date | null | undefined) {
  return date ? date.toISOString() : null;
}

function serializeUser(user: {
  name: string;
  email: string;
  psychologist: {
    id: string;
    crp: string;
    crpState: string | null;
    crpRegion: string | null;
    crpNumber: string | null;
    crpVerificationStatus: "PENDING" | "APPROVED" | "REJECTED";
    crpVerifiedAt: Date | null;
    crpRejectedAt: Date | null;
    crpRejectionReason: string | null;
  } | null;
}) {
  return {
    user: {
      name: user.name,
      email: user.email,
    },
    psychologist: user.psychologist
      ? {
          id: user.psychologist.id,
          crp: user.psychologist.crp,
          crpState: user.psychologist.crpState,
          crpRegion: user.psychologist.crpRegion,
          crpNumber: user.psychologist.crpNumber,
          crpVerificationStatus: user.psychologist.crpVerificationStatus,
          crpVerifiedAt: serializeDate(user.psychologist.crpVerifiedAt),
          crpRejectedAt: serializeDate(user.psychologist.crpRejectedAt),
          crpRejectionReason: user.psychologist.crpRejectionReason,
        }
      : null,
  };
}

async function getCurrentPsychologistUser() {
  const session = await getServerSession(authConfig);
  const sessionUser = session?.user as SessionUser | undefined;

  if (!sessionUser) {
    return null;
  }

  if (sessionUser.role !== "PSYCHOLOGIST") {
    return null;
  }

  const where = sessionUser.id
    ? { id: sessionUser.id }
    : sessionUser.email
      ? { email: sessionUser.email }
      : null;

  if (!where) {
    return null;
  }

  return prisma.user.findUnique({
    where,
    include: {
      psychologist: true,
    },
  });
}

export async function GET() {
  try {
    const user = await getCurrentPsychologistUser();

    if (!user || !user.psychologist) {
      return NextResponse.json(
        { error: "Cadastro profissional não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(serializeUser(user));
  } catch (error) {
    console.error("Erro ao carregar dados do CRP:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os dados profissionais." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentPsychologistUser();

    if (!user || !user.psychologist) {
      return NextResponse.json(
        { error: "Cadastro profissional não encontrado." },
        { status: 404 },
      );
    }

    if (user.psychologist.crpVerificationStatus !== "REJECTED") {
      return NextResponse.json(
        { error: "Só é possível reenviar dados quando o CRP está rejeitado." },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));

    const name = normalizeName(body?.name);
    const crpState = normalizeState(body?.crpState);
    const crpRegion = normalizeDigits(body?.crpRegion);
    const crpNumber = normalizeDigits(body?.crpNumber);

    if (!name || name.length < 5 || !name.includes(" ")) {
      return NextResponse.json(
        { error: "Informe seu nome completo." },
        { status: 400 },
      );
    }

    if (!validStates.has(crpState)) {
      return NextResponse.json(
        { error: "Informe um estado válido para o CRP." },
        { status: 400 },
      );
    }

    if (!crpRegion) {
      return NextResponse.json(
        { error: "Informe a regional do CRP." },
        { status: 400 },
      );
    }

    if (!crpNumber) {
      return NextResponse.json(
        { error: "Informe o número do CRP." },
        { status: 400 },
      );
    }

    const crp = buildCrp(crpRegion, crpNumber);

    const duplicatedCrp = await prisma.psychologist.findFirst({
      where: {
        crp,
        id: {
          not: user.psychologist.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicatedCrp) {
      return NextResponse.json(
        { error: "Este CRP já está cadastrado em outro usuário." },
        { status: 409 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        name,
        psychologist: {
          update: {
            crp,
            crpState,
            crpRegion,
            crpNumber,
            crpVerificationStatus: "PENDING",
            crpVerifiedAt: null,
            crpRejectedAt: null,
            crpRejectionReason: null,
          },
        },
      },
      include: {
        psychologist: true,
      },
    });

    return NextResponse.json(serializeUser(updatedUser));
  } catch (error) {
    console.error("Erro ao reenviar CRP para análise:", error);

    return NextResponse.json(
      { error: "Não foi possível reenviar os dados para análise." },
      { status: 500 },
    );
  }
}
