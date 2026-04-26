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

async function createGoogleEvent(accessToken: string, payload: any) {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const data = await response.json();

  return { response, data };
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

  const googleAccessToken = (token as any)?.googleAccessToken;
  const googleRefreshToken = (token as any)?.googleRefreshToken;

  if (!googleAccessToken) {
    return NextResponse.json(
      { error: "Google Calendar não conectado." },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();

    const {
      title,
      date,
      startTime,
      endTime,
      location,
      description,
      patientId,
    } = body;

    if (!title || !date || !startTime || !endTime || !patientId) {
      return NextResponse.json(
        {
          error:
            "Título, paciente, data, hora inicial e hora final são obrigatórios.",
        },
        { status: 400 },
      );
    }

    const startDateTime = new Date(`${date}T${startTime}:00-03:00`);
    const endDateTime = new Date(`${date}T${endTime}:00-03:00`);

    if (endDateTime <= startDateTime) {
      return NextResponse.json(
        { error: "A hora final deve ser maior que a hora inicial." },
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

    const patient = await prisma.patient.findUnique({
      where: {
        id: patientId,
      },
      include: {
        user: true,
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Paciente não encontrado." },
        { status: 404 },
      );
    }

    const googlePayload = {
      summary: title,
      description:
        description ||
        `Consulta vinculada ao paciente ${patient.user.name} no PsicoConnect.`,
      location: location || "",
      start: {
        dateTime: `${date}T${startTime}:00`,
        timeZone: "America/Fortaleza",
      },
      end: {
        dateTime: `${date}T${endTime}:00`,
        timeZone: "America/Fortaleza",
      },
    };

    let accessTokenToUse = googleAccessToken;

    let { response, data } = await createGoogleEvent(
      accessTokenToUse,
      googlePayload,
    );

    if (response.status === 401 && googleRefreshToken) {
      accessTokenToUse = await refreshGoogleAccessToken(googleRefreshToken);
      ({ response, data } = await createGoogleEvent(
        accessTokenToUse,
        googlePayload,
      ));
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message || "Erro ao criar evento no Google Calendar.",
          details: data,
        },
        { status: response.status },
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        title,
        description: description || "",
        location: location || "",
        dateTime: startDateTime,
        endDateTime,
        googleEventId: data.id,
        googleEventLink: data.htmlLink || "",
        patientId: patient.id,
        psychologistId: psychologist.id,
      },
    });

    return NextResponse.json({
      message: "Consulta criada com sucesso.",
      appointment,
      googleEvent: data,
    });
  } catch (error: any) {
    console.error("Erro ao criar consulta:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao criar consulta.",
      },
      { status: 500 },
    );
  }
}
