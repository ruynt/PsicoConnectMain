import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";

async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error_description ||
        data?.error ||
        "Erro ao renovar token do Google.",
    );
  }

  return data.access_token as string;
}

async function deleteGoogleEvent(accessToken: string, googleEventId: string) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (response.status === 204) {
    return {
      response,
      data: null,
    };
  }

  const text = await response.text();

  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return {
    response,
    data,
  };
}

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const { appointmentId } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { error: "ID da consulta é obrigatório." },
        { status: 400 },
      );
    }

    const psychologist = await prisma.psychologist.findUnique({
      where: {
        userId: String(token.id),
      },
    });

    if (!psychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado para este usuário." },
        { status: 404 },
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Consulta não encontrada." },
        { status: 404 },
      );
    }

    if (appointment.psychologistId !== psychologist.id) {
      return NextResponse.json(
        { error: "Você não tem permissão para cancelar esta consulta." },
        { status: 403 },
      );
    }

    if (appointment.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Esta consulta já está cancelada." },
        { status: 400 },
      );
    }

    const googleAccessToken = (token as any)?.googleAccessToken;
    const googleRefreshToken = (token as any)?.googleRefreshToken;

    if (appointment.googleEventId && googleAccessToken) {
      let accessTokenToUse = googleAccessToken;

      let { response, data } = await deleteGoogleEvent(
        accessTokenToUse,
        appointment.googleEventId,
      );

      if (response.status === 401 && googleRefreshToken) {
        accessTokenToUse = await refreshGoogleAccessToken(googleRefreshToken);

        ({ response, data } = await deleteGoogleEvent(
          accessTokenToUse,
          appointment.googleEventId,
        ));
      }

      if (!response.ok && response.status !== 404) {
        return NextResponse.json(
          {
            error:
              data?.error?.message ||
              "Erro ao cancelar evento no Google Calendar.",
            details: data,
          },
          { status: response.status },
        );
      }
    }

    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: appointment.id,
      },
      data: {
        status: "CANCELLED",
      },
    });

    return NextResponse.json({
      message: "Consulta cancelada com sucesso.",
      appointment: updatedAppointment,
    });
  } catch (error: any) {
    console.error("Erro ao cancelar consulta:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao cancelar consulta.",
      },
      { status: 500 },
    );
  }
}
