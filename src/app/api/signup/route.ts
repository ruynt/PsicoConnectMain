import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";

import {
  generateVerificationToken,
  sendVerificationEmail,
} from "../../../lib/emails";
import prisma from "../../../lib/prisma";

const schema = z
  .object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(8),
    role: z.enum(["PSICOLOGO", "PACIENTE"]),
    crp: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem",
  })
  .refine(
    (data) => {
      if (data.role === "PSICOLOGO" && (!data.crp || data.crp.trim() === "")) {
        return false;
      }

      return true;
    },
    {
      path: ["crp"],
      message: "CRP é obrigatório para psicólogos.",
    },
  );

function normalizeCrp(crp: string) {
  return crp.trim().toUpperCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const normalizedEmail = data.email.trim().toLowerCase();
    const normalizedCrp = data.crp ? normalizeCrp(data.crp) : null;

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

    if (data.role === "PSICOLOGO" && normalizedCrp) {
      const crpExists = await prisma.psychologist.findUnique({
        where: { crp: normalizedCrp },
      });

      if (crpExists) {
        return NextResponse.json(
          { error: "Este CRP já está cadastrado." },
          { status: 409 },
        );
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const roleInEnglish = data.role === "PACIENTE" ? "PATIENT" : "PSYCHOLOGIST";

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: roleInEnglish,
      },
    });

    if (user.role === "PSYCHOLOGIST") {
      await prisma.psychologist.create({
        data: {
          userId: user.id,
          crp: normalizedCrp!,
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
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Dados de validação inválidos",
          details: e.flatten().fieldErrors,
        },
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
