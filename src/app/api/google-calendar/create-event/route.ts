import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { getErrorMessage, getExternalApiErrorMessage } from "@/lib/errorUtils";

const TIME_ZONE = "America/Fortaleza";

function cleanText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
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
    localDateTime: `${normalizedDate}T${normalizedTime}:00`,
    date: parsed,
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

async function createGoogleEvent(
  accessToken: string,
  payload: {
    summary: string;
    description: string;
    location: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
  },
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

  const data = await response.json();

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
    const psychologist = await prisma.psychologist.findUnique({
      where: {
        userId: String(token.id),
      },
      select: {
        id: true,
        googleAccessToken: true,
        googleRefreshToken: true,
        googleAccessTokenExpires: true,
      },
    });

    if (!psychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado." },
        { status: 404 },
      );
    }

    const body = await req.json().catch(() => ({}));

    const title = cleanText(body.title, 120);
    const location = cleanText(body.location, 250);
    const description = cleanText(body.description, 1000);
    const startDateTime = parseDateTime(body.date, body.startTime);
    const endDateTime = parseDateTime(body.date, body.endTime);

    if (!title || !startDateTime || !endDateTime) {
      return NextResponse.json(
        { error: "Título, data, hora inicial e hora final são obrigatórios." },
        { status: 400 },
      );
    }

    if (endDateTime.date <= startDateTime.date) {
      return NextResponse.json(
        { error: "A hora final deve ser maior que a hora inicial." },
        { status: 400 },
      );
    }

    const googleAccessToken = await getValidGoogleAccessToken(psychologist);

    if (!googleAccessToken) {
      return NextResponse.json(
        { error: "Google Calendar não conectado." },
        { status: 401 },
      );
    }

    const payload = {
      summary: title,
      description,
      location,
      start: {
        dateTime: startDateTime.localDateTime,
        timeZone: TIME_ZONE,
      },
      end: {
        dateTime: endDateTime.localDateTime,
        timeZone: TIME_ZONE,
      },
    };

    let { response, data } = await createGoogleEvent(
      googleAccessToken,
      payload,
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
        payload,
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

    return NextResponse.json({
      message: "Evento criado com sucesso no Google Calendar.",
      event: data,
    });
  } catch (error: unknown) {
    console.error("Erro ao criar evento:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro interno ao criar evento no Google Calendar.",
        ),
      },
      { status: 500 },
    );
  }
}
