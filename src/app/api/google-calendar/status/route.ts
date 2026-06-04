import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return NextResponse.json(
      { connected: false, calendarEmail: "", error: "Acesso não autorizado." },
      { status: 403 },
    );
  }

  const psychologist = await prisma.psychologist.findUnique({
    where: {
      userId: String(token.id),
    },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleCalendarEmail: true,
    },
  });

  if (!psychologist) {
    return NextResponse.json(
      { connected: false, calendarEmail: "", error: "Psicólogo não encontrado." },
      { status: 404 },
    );
  }

  const connected = Boolean(
    psychologist.googleAccessToken || psychologist.googleRefreshToken,
  );

  return NextResponse.json({
    connected,
    calendarEmail: psychologist.googleCalendarEmail || "",
  });
}
