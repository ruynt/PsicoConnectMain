import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";

const REQUIRED_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

function getGoogleOAuthCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth não configurado. Confira GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.",
    );
  }

  return {
    clientId,
    clientSecret,
  };
}

function redirectToAgenda(req: NextRequest, params: Record<string, string>) {
  const agendaUrl = new URL("/agenda", req.url);

  Object.entries(params).forEach(([key, value]) => {
    agendaUrl.searchParams.set(key, value);
  });

  const response = NextResponse.redirect(agendaUrl);
  response.cookies.delete("psicoconnect_google_oauth_state");

  return response;
}

function hasRequiredCalendarScope(scope: string | undefined) {
  if (!scope) {
    return true;
  }

  return scope.split(/\s+/).includes(REQUIRED_CALENDAR_SCOPE);
}

async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const { clientId, clientSecret } = getGoogleOAuthCredentials();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error_description ||
        data?.error ||
        "Erro ao conectar Google Calendar.",
    );
  }

  return data as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
    id_token?: string;
  };
}

async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error ||
        "Erro ao obter e-mail da conta Google.",
    );
  }

  return data as {
    email?: string;
    name?: string;
  };
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || token.role !== "PSYCHOLOGIST") {
      return redirectToAgenda(req, { googleError: "unauthorized" });
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const savedState = req.cookies.get("psicoconnect_google_oauth_state")?.value;

    if (!code) {
      return redirectToAgenda(req, { googleError: "missing_code" });
    }

    if (!state || !savedState || state !== savedState) {
      return redirectToAgenda(req, { googleError: "invalid_state" });
    }

    const psychologist = await prisma.psychologist.findUnique({
      where: {
        userId: String(token.id),
      },
      select: {
        id: true,
        googleRefreshToken: true,
      },
    });

    if (!psychologist) {
      return redirectToAgenda(req, {
        googleError: "psychologist_not_found",
      });
    }

    const redirectUri = new URL("/api/google-calendar/callback", req.url);
    const tokenData = await exchangeCodeForTokens(code, redirectUri.toString());

    if (!hasRequiredCalendarScope(tokenData.scope)) {
      return redirectToAgenda(req, { googleError: "missing_calendar_scope" });
    }

    const googleUser = await fetchGoogleUserInfo(tokenData.access_token);

    const refreshTokenToSave =
      tokenData.refresh_token || psychologist.googleRefreshToken;

    if (!refreshTokenToSave) {
      return redirectToAgenda(req, { googleError: "missing_refresh_token" });
    }

    const expiresInSeconds = Number(tokenData.expires_in || 3600);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await prisma.psychologist.update({
      where: {
        id: psychologist.id,
      },
      data: {
        googleAccessToken: tokenData.access_token,
        googleRefreshToken: refreshTokenToSave,
        googleAccessTokenExpires: expiresAt,
        googleCalendarEmail: googleUser.email || null,
      },
    });

    return redirectToAgenda(req, { googleConnected: "1" });
  } catch (error) {
    console.error("Erro no callback do Google Calendar:", error);

    return redirectToAgenda(req, { googleError: "callback_error" });
  }
}
