import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcrypt";
import prisma from "./prisma";

type UserRole = "ADMIN" | "PSYCHOLOGIST" | "PATIENT";
type CrpVerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

type AuthenticatedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  crpVerificationStatus?: CrpVerificationStatus | null;
  crpVerifiedAt?: string | null;
};

type SessionUserWithCustomFields = {
  id?: string;
  role?: UserRole;
  crpVerificationStatus?: CrpVerificationStatus | null;
  crpVerifiedAt?: string | null;
};

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
          password: z.string().min(1),
        });

        if (!creds) {
          throw new Error("INVALID_CREDENTIALS");
        }

        const parsed = schema.safeParse(creds);

        if (!parsed.success) {
          throw new Error("INVALID_CREDENTIALS");
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
          throw new Error("INVALID_CREDENTIALS");
        }

        const ok = await bcrypt.compare(password, user.passwordHash);

        if (!ok) {
          throw new Error("INVALID_CREDENTIALS");
        }

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        if (!user.role) {
          throw new Error("ACCOUNT_INCOMPLETE");
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
  ],
  callbacks: {
    async jwt({ token, user }) {
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
        const authUser = user as AuthenticatedUser;

        token.id = authUser.id;
        token.role = authUser.role;
        token.crpVerificationStatus = authUser.crpVerificationStatus ?? null;
        token.crpVerifiedAt = authUser.crpVerifiedAt ?? null;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as typeof session.user &
          SessionUserWithCustomFields;

        sessionUser.id = typeof token.id === "string" ? token.id : undefined;

        sessionUser.role =
          token.role === "ADMIN" ||
          token.role === "PSYCHOLOGIST" ||
          token.role === "PATIENT"
            ? token.role
            : undefined;

        sessionUser.crpVerificationStatus =
          token.crpVerificationStatus === "PENDING" ||
          token.crpVerificationStatus === "APPROVED" ||
          token.crpVerificationStatus === "REJECTED"
            ? token.crpVerificationStatus
            : null;

        sessionUser.crpVerifiedAt =
          typeof token.crpVerifiedAt === "string" ? token.crpVerifiedAt : null;
      }

      return session;
    },
  },
};