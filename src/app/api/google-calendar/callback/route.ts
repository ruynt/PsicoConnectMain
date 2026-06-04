import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";

async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
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
  const agendaUrl = new URL("/agenda", req.url);
  const response = NextResponse.redirect(agendaUrl);

  response.cookies.delete("psicoconnect_google_oauth_state");

  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || token.role !== "PSYCHOLOGIST") {
      agendaUrl.searchParams.set("googleError", "unauthorized");
      return NextResponse.redirect(agendaUrl);
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const savedState = req.cookies.get("psicoconnect_google_oauth_state")?.value;

    if (!code) {
      agendaUrl.searchParams.set("googleError", "missing_code");
      return response;
    }

    if (!state || !savedState || state !== savedState) {
      agendaUrl.searchParams.set("googleError", "invalid_state");
      return response;
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
      agendaUrl.searchParams.set("googleError", "psychologist_not_found");
      return response;
    }

    const redirectUri = new URL("/api/google-calendar/callback", req.url);
    const tokenData = await exchangeCodeForTokens(code, redirectUri.toString());
    const googleUser = await fetchGoogleUserInfo(tokenData.access_token);

    const refreshTokenToSave =
      tokenData.refresh_token || psychologist.googleRefreshToken;

    if (!refreshTokenToSave) {
      agendaUrl.searchParams.set("googleError", "missing_refresh_token");
      return response;
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

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

    agendaUrl.searchParams.set("googleConnected", "1");
    return response;
  } catch (error) {
    console.error("Erro no callback do Google Calendar:", error);
    agendaUrl.searchParams.set("googleError", "callback_error");
    return response;
  }
}
