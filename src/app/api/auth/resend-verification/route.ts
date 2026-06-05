import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";

import prisma from "../../../../lib/prisma";
import {
  generateVerificationToken,
  sendVerificationEmail,
} from "../../../../lib/emails";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const normalizedEmail = data.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return NextResponse.json({
        resent: false,
        message: "Não foi possível reenviar o e-mail de verificação.",
      });
    }

    const passwordIsValid = await bcrypt.compare(
      data.password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      return NextResponse.json({
        resent: false,
        message: "Não foi possível reenviar o e-mail de verificação.",
      });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        resent: false,
        alreadyVerified: true,
        message: "Este e-mail já foi verificado. Faça login normalmente.",
      });
    }

    const verificationToken = await generateVerificationToken(user.email);

    await sendVerificationEmail(
      verificationToken.email,
      verificationToken.token,
    );

    return NextResponse.json({
      resent: true,
      message:
        "Enviamos novamente o e-mail de verificação. Confira sua caixa de entrada e confirme seu e-mail para acessar.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          resent: false,
          error: "Dados inválidos.",
          details: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    console.error("Erro ao reenviar e-mail de verificação:", error);

    return NextResponse.json(
      {
        resent: false,
        error: "Não foi possível reenviar o e-mail de verificação.",
      },
      { status: 500 },
    );
  }
}
