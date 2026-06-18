import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { getErrorMessage, getExternalApiErrorMessage } from "@/lib/errorUtils";
import { decryptGoogleToken, encryptGoogleToken } from "@/lib/google-calendar-tokens";

type GoogleCalendarEvent = {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  eventType?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
};

type GoogleCalendarEventsResponse = {
  items?: GoogleCalendarEvent[];
  error?: string | { message?: string };
  error_description?: string;
  raw?: string;
};

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

async function fetchGoogleEvents(accessToken: string) {
  const now = new Date().toISOString();

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
  );

  url.searchParams.set("timeMin", now);
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const text = await response.text();

  let data: GoogleCalendarEventsResponse = {};
  try {
    data = text ? (JSON.parse(text) as GoogleCalendarEventsResponse) : {};
  } catch {
    data = { raw: text };
  }

  return { response, data };
}

async function getValidGoogleAccessToken(psychologist: {
  id: string;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleAccessTokenExpires: Date | null;
}) {
  const accessToken = decryptGoogleToken(psychologist.googleAccessToken);
  const refreshToken = decryptGoogleToken(psychologist.googleRefreshToken);
  const expiresAt = psychologist.googleAccessTokenExpires?.getTime() || 0;
  const tokenIsValid = accessToken && expiresAt > Date.now() + 60 * 1000;

  if (tokenIsValid) {
    return accessToken;
  }

  if (!refreshToken) {
    return null;
  }

  const refreshed = await refreshGoogleAccessToken(refreshToken);

  await prisma.psychologist.update({
    where: {
      id: psychologist.id,
    },
    data: {
      googleAccessToken: encryptGoogleToken(refreshed.accessToken),
      googleAccessTokenExpires: refreshed.expiresAt,
    },
  });

  return refreshed.accessToken;
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || token.role !== "PSYCHOLOGIST") {
      return NextResponse.json(
        { error: "Acesso não autorizado.", events: [] },
        { status: 403 },
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
      },
    });

    if (!psychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado.", events: [] },
        { status: 404 },
      );
    }

    const googleAccessToken = await getValidGoogleAccessToken(psychologist);

    if (!googleAccessToken) {
      return NextResponse.json(
        { error: "Google Calendar não conectado.", events: [] },
        { status: 401 },
      );
    }

    let { response, data } = await fetchGoogleEvents(googleAccessToken);

    const refreshToken = decryptGoogleToken(psychologist.googleRefreshToken);

    if (response.status === 401 && refreshToken) {
      const refreshed = await refreshGoogleAccessToken(refreshToken);

      await prisma.psychologist.update({
        where: {
          id: psychologist.id,
        },
        data: {
          googleAccessToken: encryptGoogleToken(refreshed.accessToken),
          googleAccessTokenExpires: refreshed.expiresAt,
        },
      });

      ({ response, data } = await fetchGoogleEvents(refreshed.accessToken));
    }

    if (!response.ok) {
      console.log("GOOGLE EVENTS ERROR:", JSON.stringify(data, null, 2));

      return NextResponse.json(
        {
          error:
            getExternalApiErrorMessage(
            data,
            "Erro ao buscar eventos do Google Calendar.",
          ),
          details: data,
          events: [],
        },
        { status: response.status },
      );
    }

    const events = (data.items || [])
      .filter((event) => {
        return event.status !== "cancelled" && event.eventType !== "birthday";
      })
      .map((event) => ({
        id: event.id,
        title: event.summary || "Sem título",
        description: event.description || "",
        start: event.start?.dateTime || event.start?.date || null,
        end: event.end?.dateTime || event.end?.date || null,
        location: event.location || "",
        htmlLink: event.htmlLink || "",
        status: event.status || "",
      }));

    return NextResponse.json({ events });
  } catch (error: unknown) {
    console.error("Erro interno na rota de eventos:", error);

    return NextResponse.json(
      {
        error:
          getErrorMessage(error, "Erro interno ao buscar eventos do Google Calendar."),
        events: [],
      },
      { status: 500 },
    );
  }
}
