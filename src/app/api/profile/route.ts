import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authConfig } from "../../../lib/auth";
import prisma from "../../../lib/prisma";
import { decryptNullableSensitiveText, encryptNullableSensitiveText } from "@/lib/encryption";
import {
  optionalTrimmedString,
  parseJsonBody,
  requiredTrimmedString,
} from "@/lib/api-validation";

const INVALID_VALUE = "__INVALID_VALUE__";

const updateProfileSchema = z.object({
  name: requiredTrimmedString(
    120,
    "Informe o nome completo.",
    "O nome deve ter no máximo 120 caracteres.",
  ),
  profileImageUrl: optionalTrimmedString(
    1000,
    "A URL da foto de perfil deve ter no máximo 1000 caracteres.",
  ),
  phone: optionalTrimmedString(
    32,
    "O telefone deve ter no máximo 32 caracteres.",
  ),
  city: optionalTrimmedString(
    80,
    "A cidade deve ter no máximo 80 caracteres.",
  ),
  state: optionalTrimmedString(
    20,
    "O estado deve ter no máximo 20 caracteres.",
  ),
  bio: optionalTrimmedString(
    1200,
    "A biografia deve ter no máximo 1200 caracteres.",
  ),
  professionalTitle: optionalTrimmedString(
    120,
    "O título profissional deve ter no máximo 120 caracteres.",
  ),
  approach: optionalTrimmedString(
    250,
    "A abordagem deve ter no máximo 250 caracteres.",
  ),
  specialties: optionalTrimmedString(
    500,
    "As especialidades devem ter no máximo 500 caracteres.",
  ),
  education: optionalTrimmedString(
    700,
    "A formação deve ter no máximo 700 caracteres.",
  ),
  targetAudience: optionalTrimmedString(
    250,
    "O público atendido deve ter no máximo 250 caracteres.",
  ),
  instagramUrl: optionalTrimmedString(
    120,
    "O usuário do Instagram deve ter no máximo 120 caracteres.",
  ),
  socialName: optionalTrimmedString(
    120,
    "O nome social deve ter no máximo 120 caracteres.",
  ),
  birthDate: optionalTrimmedString(
    10,
    "Informe uma data de nascimento válida.",
  ),
  contactPreference: optionalTrimmedString(
    250,
    "A preferência de contato deve ter no máximo 250 caracteres.",
  ),
  emergencyContactName: optionalTrimmedString(
    120,
    "O contato de emergência deve ter no máximo 120 caracteres.",
  ),
  emergencyContactPhone: optionalTrimmedString(
    32,
    "O telefone de emergência deve ter no máximo 32 caracteres.",
  ),
  patientNotes: optionalTrimmedString(
    1200,
    "As observações devem ter no máximo 1200 caracteres.",
  ),
});

function cleanText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function cleanUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length > 1000) {
    return INVALID_VALUE;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return INVALID_VALUE;
    }

    return url.toString();
  } catch {
    return INVALID_VALUE;
  }
}

function cleanPhone(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/[a-zA-ZÀ-ÿ]/.test(trimmed)) {
    return INVALID_VALUE;
  }

  let digits = trimmed.replace(/\D/g, "");

  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }

  digits = digits.slice(0, 11);

  if (digits.length < 10) {
    return INVALID_VALUE;
  }

  return digits;
}

function cleanState(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const state = trimmed.replace(/[^a-zA-Z]/g, "").toUpperCase();

  if (!/^[A-Z]{2}$/.test(state)) {
    return INVALID_VALUE;
  }

  return state;
}

function cleanInstagramUsername(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const username = trimmed
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^www\.instagram\.com\//i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^@+/, "")
    .split(/[/?#\s]/)[0]
    .replace(/[^a-zA-Z0-9._]/g, "")
    .slice(0, 30);

  if (!username) {
    return INVALID_VALUE;
  }

  return username;
}

function parseBirthDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return {
      date: null,
      invalid: false,
    };
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return {
      date: null,
      invalid: true,
    };
  }

  const now = new Date();

  if (date > now) {
    return {
      date: null,
      invalid: true,
    };
  }

  return {
    date,
    invalid: false,
  };
}

function formatBirthDate(date: Date | null | undefined) {
  if (!date) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

async function getCurrentUser() {
  const session = await getServerSession(authConfig);
  const email = session?.user?.email;

  if (!email) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      patient: true,
      psychologist: true,
    },
  });
}

function mapProfile(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileImageUrl: user.profileImageUrl || "",
    phone: decryptNullableSensitiveText(user.phone),
    city: user.city || "",
    state: user.state || "",
    bio: decryptNullableSensitiveText(user.bio),
    patient: user.patient
      ? {
          id: user.patient.id,
          socialName: decryptNullableSensitiveText(user.patient.socialName),
          birthDate: formatBirthDate(user.patient.birthDate),
          contactPreference: decryptNullableSensitiveText(user.patient.contactPreference),
          emergencyContactName: decryptNullableSensitiveText(user.patient.emergencyContactName),
          emergencyContactPhone: decryptNullableSensitiveText(user.patient.emergencyContactPhone),
          patientNotes: decryptNullableSensitiveText(user.patient.patientNotes),
        }
      : null,
    psychologist: user.psychologist
      ? {
          id: user.psychologist.id,
          crp: user.psychologist.crp,
          crpState: user.psychologist.crpState || "",
          crpRegion: user.psychologist.crpRegion || "",
          crpNumber: user.psychologist.crpNumber || "",
          crpVerificationStatus: user.psychologist.crpVerificationStatus,
          professionalTitle: user.psychologist.professionalTitle || "",
          approach: user.psychologist.approach || "",
          specialties: user.psychologist.specialties || "",
          education: user.psychologist.education || "",
          targetAudience: user.psychologist.targetAudience || "",
          instagramUrl: user.psychologist.instagramUrl || "",
        }
      : null,
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      profile: mapProfile(user),
    });
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar o perfil." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 },
      );
    }

    const parsedBody = await parseJsonBody(req, updateProfileSchema);

    if (parsedBody.error) {
      return parsedBody.error;
    }

    const body = parsedBody.data;
    const name = body.name;

    if (!name) {
      return NextResponse.json(
        { error: "Informe o nome completo." },
        { status: 400 },
      );
    }

    const profileImageUrl = cleanUrl(body.profileImageUrl);
    const phone = cleanPhone(body.phone);
    const state = cleanState(body.state);
    const instagramUrl = cleanInstagramUsername(body.instagramUrl);
    const emergencyContactPhone = cleanPhone(body.emergencyContactPhone);
    const birthDate = parseBirthDate(body.birthDate);

    if (profileImageUrl === INVALID_VALUE) {
      return NextResponse.json(
        {
          error:
            "A foto de perfil precisa ser uma URL válida iniciada por http:// ou https://.",
        },
        { status: 400 },
      );
    }

    if (phone === INVALID_VALUE) {
      return NextResponse.json(
        { error: "Informe um telefone válido com DDD, sem letras." },
        { status: 400 },
      );
    }

    if (state === INVALID_VALUE) {
      return NextResponse.json(
        { error: "Informe o estado com 2 letras, por exemplo: PB." },
        { status: 400 },
      );
    }

    if (instagramUrl === INVALID_VALUE) {
      return NextResponse.json(
        { error: "Informe apenas o usuário do Instagram." },
        { status: 400 },
      );
    }

    if (emergencyContactPhone === INVALID_VALUE) {
      return NextResponse.json(
        {
          error:
            "Informe um telefone de emergência válido com DDD, sem letras.",
        },
        { status: 400 },
      );
    }

    if (birthDate.invalid) {
      return NextResponse.json(
        { error: "Informe uma data de nascimento válida." },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          name,
          profileImageUrl,
          phone: encryptNullableSensitiveText(phone),
          city: cleanText(body.city, 80),
          state,
          bio: encryptNullableSensitiveText(cleanText(body.bio, 1200)),
        },
        include: {
          patient: true,
          psychologist: true,
        },
      });

      if (updatedUser.role === "PSYCHOLOGIST" && updatedUser.psychologist) {
        await tx.psychologist.update({
          where: {
            id: updatedUser.psychologist.id,
          },
          data: {
            professionalTitle: cleanText(body.professionalTitle, 120),
            approach: cleanText(body.approach, 250),
            specialties: cleanText(body.specialties, 500),
            education: cleanText(body.education, 700),
            targetAudience: cleanText(body.targetAudience, 250),
            instagramUrl,
          },
        });
      }

      if (updatedUser.role === "PATIENT" && updatedUser.patient) {
        await tx.patient.update({
          where: {
            id: updatedUser.patient.id,
          },
          data: {
            socialName: encryptNullableSensitiveText(
              cleanText(body.socialName, 120),
            ),
            birthDate: birthDate.date,
            contactPreference: encryptNullableSensitiveText(
              cleanText(body.contactPreference, 250),
            ),
            emergencyContactName: encryptNullableSensitiveText(
              cleanText(body.emergencyContactName, 120),
            ),
            emergencyContactPhone: encryptNullableSensitiveText(emergencyContactPhone),
            patientNotes: encryptNullableSensitiveText(
              cleanText(body.patientNotes, 1200),
            ),
          },
        });
      }
    });

    return NextResponse.json({
      message: "Perfil atualizado com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);

    return NextResponse.json(
      { error: "Não foi possível atualizar o perfil." },
      { status: 500 },
    );
  }
}