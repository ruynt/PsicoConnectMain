import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { getErrorCode } from "@/lib/errorUtils";

import {
  generateVerificationToken,
  sendVerificationEmail,
} from "../../../lib/emails";
import { LEGAL_VERSION } from "../../../lib/legal/legalContent";
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

const GENERIC_SIGNUP_ERROR =
  "Não foi possível concluir o cadastro no momento. Confira os dados e tente novamente.";

const schema = z
  .object({
    name: z.string().min(2, "Informe um nome com pelo menos 2 caracteres."),
    email: z.string().email("Informe um e-mail válido."),
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
    confirmPassword: z.string().min(8, "Confirme sua senha."),
    role: z.enum(["PSICOLOGO", "PACIENTE"], {
      error: "Selecione se o cadastro é de psicólogo ou paciente.",
    }),

    crp: z.string().optional(),
    crpRegion: z.string().optional(),
    crpState: z.string().optional(),
    crpNumber: z.string().optional(),

    acceptedLegal: z.boolean().optional().default(false),
    acceptedSensitiveAi: z.boolean().optional().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  })
  .refine((data) => data.acceptedLegal === true, {
    path: ["acceptedLegal"],
    message:
      "Para criar sua conta, é necessário aceitar os Termos de Uso e a Política de Privacidade.",
  })
  .refine((data) => data.acceptedSensitiveAi === true, {
    path: ["acceptedSensitiveAi"],
    message:
      "Para criar sua conta, é necessário autorizar o tratamento de dados sensíveis e compreender os limites do uso da Inteligência Artificial.",
  })
  .refine(
    (data) => {
      if (data.role !== "PSICOLOGO") return true;

      return Boolean(data.crpState && data.crpNumber);
    },
    {
      path: ["crpNumber"],
      message:
        "Informe o estado/regional e o número do CRP para concluir o cadastro como psicólogo.",
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

function getFirstValidationMessage(error: z.ZodError) {
  const firstIssue = error.issues.find((issue) => {
    return typeof issue.message === "string" && issue.message.trim().length > 0;
  });

  return (
    firstIssue?.message || "Alguns dados do cadastro precisam ser corrigidos."
  );
}

function getPrismaErrorTarget(error: unknown) {
  if (typeof error !== "object" || error === null || !("meta" in error)) {
    return "";
  }

  const meta = (error as { meta?: { target?: unknown } }).meta;
  const target = meta?.target;

  if (Array.isArray(target)) {
    return target.join(",");
  }

  return typeof target === "string" ? target : "";
}

function getFriendlyPrismaError(error: unknown) {
  if (getErrorCode(error) !== "P2002") {
    return null;
  }

  const target = getPrismaErrorTarget(error);

  if (target.includes("email")) {
    return "Este e-mail já está em uso. Tente entrar na conta ou recuperar sua senha.";
  }

  if (target.includes("crp")) {
    return "Este CRP já está cadastrado. Confira os dados informados.";
  }

  return "Já existe um cadastro com uma das informações informadas.";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "";
}

export async function POST(req: Request) {
  try {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Não foi possível ler os dados enviados. Atualize a página e tente novamente.",
        },
        { status: 400 },
      );
    }

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
        try {
          const verificationToken = await generateVerificationToken(
            exists.email,
          );

          await sendVerificationEmail(
            verificationToken.email,
            verificationToken.token,
          );

          return NextResponse.json(
            {
              ok: true,
              message:
                "Este e-mail já estava cadastrado, mas ainda não foi verificado. Enviamos um novo link de confirmação.",
            },
            { status: 200 },
          );
        } catch (emailError) {
          console.error("Erro ao reenviar e-mail de verificação:", emailError);

          return NextResponse.json(
            {
              error:
                "Este e-mail já está cadastrado, mas não conseguimos reenviar a confirmação agora. Tente novamente em instantes.",
            },
            { status: 503 },
          );
        }
      }

      return NextResponse.json(
        {
          error:
            "Este e-mail já está em uso. Tente entrar na conta ou recuperar sua senha.",
        },
        { status: 409 },
      );
    }

    if (psychologistCrpData) {
      const crpExists = await prisma.psychologist.findUnique({
        where: { crp: psychologistCrpData.crp },
      });

      if (crpExists) {
        return NextResponse.json(
          {
            error:
              "Este CRP já está cadastrado. Confira os dados informados ou utilize outro cadastro.",
          },
          { status: 409 },
        );
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const roleInEnglish =
      data.role === "PACIENTE" ? "PATIENT" : "PSYCHOLOGIST";

    const acceptedAt = new Date();

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: data.name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: roleInEnglish,

          acceptedTermsAt: acceptedAt,
          acceptedTermsVersion: LEGAL_VERSION,

          acceptedPrivacyAt: acceptedAt,
          acceptedPrivacyVersion: LEGAL_VERSION,

          acceptedAiPolicyAt: acceptedAt,
          acceptedAiPolicyVersion: LEGAL_VERSION,

          acceptedSensitiveDataAt: acceptedAt,
          acceptedSensitiveDataVersion: LEGAL_VERSION,
        },
      });

      if (createdUser.role === "PSYCHOLOGIST") {
        if (!psychologistCrpData) {
          throw new Error("MISSING_CRP_DATA");
        }

        await tx.psychologist.create({
          data: {
            userId: createdUser.id,
            crp: psychologistCrpData.crp,
            crpRegion: psychologistCrpData.crpRegion,
            crpState: psychologistCrpData.crpState,
            crpNumber: psychologistCrpData.crpNumber,
            crpVerificationStatus: "PENDING",
            crpVerifiedAt: null,
          },
        });
      } else {
        await tx.patient.create({
          data: {
            userId: createdUser.id,
          },
        });
      }

      return createdUser;
    });

    try {
      const verificationToken = await generateVerificationToken(user.email);

      await sendVerificationEmail(
        verificationToken.email,
        verificationToken.token,
      );
    } catch (emailError) {
      console.error("Erro ao enviar e-mail de verificação:", emailError);

      return NextResponse.json(
        {
          ok: true,
          warning: true,
          message:
            "Cadastro criado, mas não foi possível enviar o e-mail de verificação agora. Tente fazer login depois para reenviar a confirmação.",
        },
        { status: 202 },
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        user.role === "PSYCHOLOGIST"
          ? "Cadastro concluído! Verifique seu e-mail. Após a confirmação, seu cadastro profissional ficará aguardando análise do CRP."
          : "Cadastro concluído! Verifique seu e-mail para ativar sua conta.",
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: getFirstValidationMessage(error),
          details: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const errorMessage = getErrorMessage(error);

    if (errorMessage === "INVALID_CRP_STATE") {
      return NextResponse.json(
        {
          error:
            "Estado/regional do CRP inválido. Confira o estado selecionado e tente novamente.",
        },
        { status: 400 },
      );
    }

    if (errorMessage === "INVALID_CRP_NUMBER") {
      return NextResponse.json(
        {
          error:
            "Número do CRP inválido. Informe apenas os números do registro profissional.",
        },
        { status: 400 },
      );
    }

    if (errorMessage === "MISSING_CRP_DATA") {
      return NextResponse.json(
        {
          error:
            "Não foi possível concluir o cadastro profissional porque os dados do CRP não foram informados corretamente.",
        },
        { status: 400 },
      );
    }

    const prismaError = getFriendlyPrismaError(error);

    if (prismaError) {
      return NextResponse.json({ error: prismaError }, { status: 409 });
    }

    console.error("Erro inesperado no cadastro:", error);

    return NextResponse.json(
      {
        error: GENERIC_SIGNUP_ERROR,
      },
      { status: 500 },
    );
  }
}