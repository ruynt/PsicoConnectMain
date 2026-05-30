import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";

import {
  generateVerificationToken,
  sendVerificationEmail,
} from "../../../lib/emails";
import prisma from "../../../lib/prisma";

const crpRegionByState: Record<string, string> = {
  DF: "01",
  PE: "02",
  BA: "03",
  MG: "04",
  RJ: "05",
  SP: "06",
  RS: "07",
  PR: "08",
  GO: "09",
  CE: "11",
  SC: "12",
  PB: "13",
  MS: "14",
  AL: "15",
  ES: "16",
  RN: "17",
  MT: "18",
  SE: "19",
  AM: "20",
  PI: "21",
  MA: "22",
  RO: "23",
  AC: "24",
};

const schema = z
  .object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(8),
    role: z.enum(["PSICOLOGO", "PACIENTE"]),

    crp: z.string().optional(),
    crpRegion: z.string().optional(),
    crpState: z.string().optional(),
    crpNumber: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem",
  })
  .refine(
    (data) => {
      if (data.role !== "PSICOLOGO") return true;

      return Boolean(data.crpState && data.crpNumber);
    },
    {
      path: ["crpNumber"],
      message: "Estado/Regional e número do CRP são obrigatórios para psicólogos.",
    },
  );

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeCrpState(value: string) {
  return value.trim().toUpperCase();
}

function normalizeCrpNumber(value: string) {
  return onlyDigits(value.trim());
}

function buildCrpFromStateAndNumber(crpState: string, crpNumber: string) {
  const normalizedState = normalizeCrpState(crpState);
  const normalizedNumber = normalizeCrpNumber(crpNumber);
  const region = crpRegionByState[normalizedState];

  if (!region) {
    throw new Error("INVALID_CRP_STATE");
  }

  if (!normalizedNumber) {
    throw new Error("INVALID_CRP_NUMBER");
  }

  return {
    crpRegion: region,
    crpState: normalizedState,
    crpNumber: normalizedNumber,
    crp: `${region}/${normalizedNumber}`,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const normalizedEmail = data.email.trim().toLowerCase();

    let psychologistCrpData: {
      crp: string;
      crpRegion: string;
      crpState: string;
      crpNumber: string;
    } | null = null;

    if (data.role === "PSICOLOGO") {
      psychologistCrpData = buildCrpFromStateAndNumber(
        data.crpState || "",
        data.crpNumber || "",
      );
    }

    const exists = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (exists) {
      if (!exists.emailVerified) {
        const verificationToken = await generateVerificationToken(exists.email);

        await sendVerificationEmail(
          verificationToken.email,
          verificationToken.token,
        );

        return NextResponse.json(
          { message: "Email já registrado. Email de verificação reenviado." },
          { status: 200 },
        );
      }

      return NextResponse.json(
        { error: "Este email já está em uso." },
        { status: 409 },
      );
    }

    if (psychologistCrpData) {
      const crpExists = await prisma.psychologist.findUnique({
        where: { crp: psychologistCrpData.crp },
      });

      if (crpExists) {
        return NextResponse.json(
          { error: "Este CRP já está cadastrado." },
          { status: 409 },
        );
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const roleInEnglish =
      data.role === "PACIENTE" ? "PATIENT" : "PSYCHOLOGIST";

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: roleInEnglish,
      },
    });

    if (user.role === "PSYCHOLOGIST") {
      if (!psychologistCrpData) {
        return NextResponse.json(
          { error: "Dados do CRP não informados." },
          { status: 400 },
        );
      }

      await prisma.psychologist.create({
        data: {
          userId: user.id,
          crp: psychologistCrpData.crp,
          crpRegion: psychologistCrpData.crpRegion,
          crpState: psychologistCrpData.crpState,
          crpNumber: psychologistCrpData.crpNumber,
          crpVerificationStatus: "PENDING",
          crpVerifiedAt: null,
        },
      });
    } else {
      await prisma.patient.create({
        data: {
          userId: user.id,
        },
      });
    }

    const verificationToken = await generateVerificationToken(user.email);

    await sendVerificationEmail(
      verificationToken.email,
      verificationToken.token,
    );

    return NextResponse.json({
      ok: true,
      message:
        user.role === "PSYCHOLOGIST"
          ? "Registro concluído! Verifique o seu email. Após a confirmação, seu cadastro profissional ficará aguardando análise do CRP."
          : "Registro concluído! Verifique o seu email.",
    });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Dados de validação inválidos",
          details: e.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (e?.message === "INVALID_CRP_STATE") {
      return NextResponse.json(
        { error: "Estado/Regional do CRP inválido." },
        { status: 400 },
      );
    }

    if (e?.message === "INVALID_CRP_NUMBER") {
      return NextResponse.json(
        { error: "Número do CRP inválido." },
        { status: 400 },
      );
    }

    console.error(e);

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}