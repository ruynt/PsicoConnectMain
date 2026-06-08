import { DefaultSession } from "next-auth";

type UserRole = "ADMIN" | "PSYCHOLOGIST" | "PATIENT";
type CrpVerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: UserRole;
      crpVerificationStatus?: CrpVerificationStatus | null;
      crpVerifiedAt?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: UserRole;
    crpVerificationStatus?: CrpVerificationStatus | null;
    crpVerifiedAt?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    crpVerificationStatus?: CrpVerificationStatus | null;
    crpVerifiedAt?: string | null;
  }
}
