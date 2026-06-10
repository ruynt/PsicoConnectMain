import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { sendAppointmentCreatedEmail } from "../../../../lib/emails";
import { getErrorMessage, getExternalApiErrorMessage } from "@/lib/errorUtils";

const TIME_ZONE = "America/Fortaleza";

type GoogleCalendarEventPayload = {
  summary: string;
  description: string;
  location: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
};

type GoogleCalendarEventResponse = {
  id?: string;
  htmlLink?: string;
  error?: unknown;
};

function cleanText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function parsePatientId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function parseDateTime(date: unknown, time: unknown) {
  if (typeof date !== "string" || typeof time !== "string") {
    return null;
  }

  const normalizedDate = date.trim();
  const normalizedTime = time.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    return null;
  }

  if (!/^\d{2}:\d{2}$/.test(normalizedTime)) {
    return null;
  }

  const parsed = new Date(`${normalizedDate}T${normalizedTime}:00-03:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return {
    dbDate: parsed,
    googleDateTime: `${normalizedDate}T${normalizedTime}:00`,
  };
}

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

  return {
    accessToken: data.access_token as string,
    expiresAt: new Date(Date.now() + Number(data.expires_in || 3600) * 1000),
  };
}

async function createGoogleEvent(
  accessToken: string,
  payload: GoogleCalendarEventPayload,
) {
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

  const data = (await response.json()) as GoogleCalendarEventResponse;

  return { response, data };
}

async function getValidGoogleAccessToken(psychologist: {
  id: string;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleAccessTokenExpires: Date | null;
}) {
  const expiresAt = psychologist.googleAccessTokenExpires?.getTime() || 0;
  const tokenIsValid =
    psychologist.googleAccessToken && expiresAt > Date.now() + 60 * 1000;

  if (tokenIsValid) {
    return psychologist.googleAccessToken as string;
  }

  if (!psychologist.googleRefreshToken) {
    return null;
  }

  const refreshed = await refreshGoogleAccessToken(
    psychologist.googleRefreshToken,
  );

  await prisma.psychologist.update({
    where: {
      id: psychologist.id,
    },
    data: {
      googleAccessToken: refreshed.accessToken,
      googleAccessTokenExpires: refreshed.expiresAt,
    },
  });

  return refreshed.accessToken;
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
    const body = await req.json().catch(() => ({}));

    const title = cleanText(body.title, 120);
    const location = cleanText(body.location, 250);
    const description = cleanText(body.description, 1000);
    const patientId = parsePatientId(body.patientId);
    const startDateTime = parseDateTime(body.date, body.startTime);
    const endDateTime = parseDateTime(body.date, body.endTime);

    if (!title || !patientId || !startDateTime || !endDateTime) {
      return NextResponse.json(
        {
          error:
            "Título, paciente, data, hora inicial e hora final são obrigatórios.",
        },
        { status: 400 },
      );
    }

    if (endDateTime.dbDate <= startDateTime.dbDate) {
      return NextResponse.json(
        { error: "A hora final deve ser maior que a hora inicial." },
        { status: 400 },
      );
    }

    const psychologist = await prisma.psychologist.findUnique({
      where: {
        userId: String(token.id),
      },
      select: {
        id: true,
        googleAccessToken: true,
        googleRefreshToken: true,
        googleAccessTokenExpires: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!psychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado para este usuário." },
        { status: 404 },
      );
    }

    const googleAccessToken = await getValidGoogleAccessToken(psychologist);

    if (!googleAccessToken) {
      return NextResponse.json(
        {
          error:
            "Google Calendar não conectado. Conecte sua agenda antes de criar uma consulta sincronizada.",
        },
        { status: 401 },
      );
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        psychologistLinks: {
          some: {
            psychologistId: psychologist.id,
            active: true,
          },
        },
      },
      select: {
        id: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Paciente não encontrado ou não vinculado a você." },
        { status: 404 },
      );
    }

    const googlePayload = {
      summary: title,
      description:
        description ||
        `Consulta vinculada ao paciente ${patient.user.name} no PsicoConnect.`,
      location,
      start: {
        dateTime: startDateTime.googleDateTime,
        timeZone: TIME_ZONE,
      },
      end: {
        dateTime: endDateTime.googleDateTime,
        timeZone: TIME_ZONE,
      },
    };

    let { response, data } = await createGoogleEvent(
      googleAccessToken,
      googlePayload,
    );

    if (response.status === 401 && psychologist.googleRefreshToken) {
      const refreshed = await refreshGoogleAccessToken(
        psychologist.googleRefreshToken,
      );

      await prisma.psychologist.update({
        where: {
          id: psychologist.id,
        },
        data: {
          googleAccessToken: refreshed.accessToken,
          googleAccessTokenExpires: refreshed.expiresAt,
        },
      });

      ({ response, data } = await createGoogleEvent(
        refreshed.accessToken,
        googlePayload,
      ));
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: getExternalApiErrorMessage(
            data,
            "Erro ao criar evento no Google Calendar.",
          ),
          details: data,
        },
        { status: response.status },
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        title,
        description,
        location,
        dateTime: startDateTime.dbDate,
        endDateTime: endDateTime.dbDate,
        googleEventId: data.id,
        googleEventLink: data.htmlLink || "",
        patientId: patient.id,
        psychologistId: psychologist.id,
      },
    });

    let emailWarning: string | null = null;

    try {
      await sendAppointmentCreatedEmail({
        patientEmail: patient.user.email,
        patientName: patient.user.name,
        psychologistName: psychologist.user.name,
        title: appointment.title || "Consulta",
        startDateTime: appointment.dateTime,
        endDateTime: appointment.endDateTime,
        location: appointment.location,
        description: appointment.description,
        googleEventLink: appointment.googleEventLink,
      });
    } catch (emailError) {
      console.error(
        "Consulta criada, mas falhou ao enviar e-mail:",
        emailError,
      );

      emailWarning =
        "Consulta criada, mas não foi possível enviar o e-mail ao paciente.";
    }

    return NextResponse.json({
      message: emailWarning
        ? "Consulta criada com sucesso, mas houve falha no envio do e-mail."
        : "Consulta criada com sucesso.",
      appointment,
      googleEvent: data,
      emailWarning,
    });
  } catch (error: unknown) {
    console.error("Erro ao criar consulta:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao criar consulta."),
      },
      { status: 500 },
    );
  }
}
