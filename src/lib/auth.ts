import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import bcrypt from "bcrypt";
import prisma from "./prisma";

async function refreshGoogleAccessToken(token: any) {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.googleRefreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      googleAccessToken: refreshedTokens.access_token,
      googleAccessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      googleRefreshToken:
        refreshedTokens.refresh_token ?? token.googleRefreshToken,
    };
  } catch (error) {
    console.error("Erro ao renovar token do Google:", error);

    return {
      ...token,
      error: "RefreshGoogleAccessTokenError",
    };
  }
}

export const authConfig: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const schema = z.object({
          email: z.string().email(),
          password: z.string().min(6),
        });

        if (!creds) {
          throw new Error("Credenciais em falta.");
        }

        const parsed = schema.safeParse(creds);

        if (!parsed.success) {
          throw new Error("Email ou senha inválidos.");
        }

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            psychologist: {
              select: {
                crpVerificationStatus: true,
                crpVerifiedAt: true,
              },
            },
          },
        });

        if (!user) {
          throw new Error("Nenhum utilizador encontrado com este email.");
        }

        const ok = await bcrypt.compare(password, user.passwordHash);

        if (!ok) {
          throw new Error("Email ou senha inválidos.");
        }

        if (!user.emailVerified) {
          throw new Error(
            "Por favor, verifique o seu email antes de fazer login.",
          );
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          crpVerificationStatus:
            user.role === "PSYCHOLOGIST"
              ? user.psychologist?.crpVerificationStatus || "PENDING"
              : null,
          crpVerifiedAt: user.psychologist?.crpVerifiedAt
            ? user.psychologist.crpVerifiedAt.toISOString()
            : null,
        };
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: {
            psychologist: {
              select: {
                crpVerificationStatus: true,
                crpVerifiedAt: true,
              },
            },
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.crpVerificationStatus =
            dbUser.role === "PSYCHOLOGIST"
              ? dbUser.psychologist?.crpVerificationStatus || "PENDING"
              : null;
          token.crpVerifiedAt = dbUser.psychologist?.crpVerifiedAt
            ? dbUser.psychologist.crpVerifiedAt.toISOString()
            : null;
        }
      }

      if (user && !token.id) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.crpVerificationStatus = (user as any).crpVerificationStatus;
        token.crpVerifiedAt = (user as any).crpVerifiedAt;
      }

      if (account?.provider === "google") {
        token.googleAccessToken = account.access_token;
        token.googleRefreshToken =
          account.refresh_token ?? token.googleRefreshToken;
        token.googleAccessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000;

        return token;
      }

      if (
        token.googleAccessToken &&
        token.googleAccessTokenExpires &&
        Date.now() < Number(token.googleAccessTokenExpires)
      ) {
        return token;
      }

      if (token.googleRefreshToken) {
        return await refreshGoogleAccessToken(token);
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).crpVerificationStatus =
          token.crpVerificationStatus;
        (session.user as any).crpVerifiedAt = token.crpVerifiedAt;
        (session.user as any).googleAccessToken = token.googleAccessToken;
        (session.user as any).googleAccessTokenExpires =
          token.googleAccessTokenExpires;
        (session.user as any).error = token.error;
      }

      return session;
    },
  },
};
