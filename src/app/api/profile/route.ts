import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "../../../lib/auth";
import prisma from "../../../lib/prisma";

const INVALID_VALUE = "__INVALID_VALUE__";

function cleanText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  return trimmed.slice(0, maxLength);
}

function cleanUrl(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return INVALID_VALUE;
  }

  return trimmed.slice(0, 1000);
}

function cleanPhone(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

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
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  const state = trimmed.replace(/[^a-zA-Z]/g, "").toUpperCase();

  if (!/^[A-Z]{2}$/.test(state)) {
    return INVALID_VALUE;
  }

  return state;
}

function cleanInstagramUsername(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  const username = trimmed
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^www\.instagram\.com\//i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^@+/, "")
    .split(/[/?#\s]/)[0]
    .replace(/[^a-zA-Z0-9._]/g, "")
    .slice(0, 30);

  if (!username) return INVALID_VALUE;

  return username;
}

function parseBirthDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function formatBirthDate(date: Date | null | undefined) {
  if (!date) return null;

  return date.toISOString().slice(0, 10);
}

async function getCurrentUser() {
  const session = await getServerSession(authConfig);
  const email = session?.user?.email;

  if (!email) return null;

  return prisma.user.findUnique({
    where: { email },
    include: {
      patient: true,
      psychologist: true,
    },
  });
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
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl || "",
        phone: user.phone || "",
        city: user.city || "",
        state: user.state || "",
        bio: user.bio || "",
        patient: user.patient
          ? {
              id: user.patient.id,
              socialName: user.patient.socialName || "",
              birthDate: formatBirthDate(user.patient.birthDate),
              contactPreference: user.patient.contactPreference || "",
              emergencyContactName: user.patient.emergencyContactName || "",
              emergencyContactPhone: user.patient.emergencyContactPhone || "",
              patientNotes: user.patient.patientNotes || "",
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
      },
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

    const body = await req.json().catch(() => ({}));

    const name = cleanText(body.name, 120);

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

    if (profileImageUrl === INVALID_VALUE) {
      return NextResponse.json(
        { error: "A foto de perfil precisa ser uma URL iniciada por http:// ou https://." },
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
        { error: "Informe um telefone de emergência válido com DDD, sem letras." },
        { status: 400 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        profileImageUrl,
        phone,
        city: cleanText(body.city, 80),
        state,
        bio: cleanText(body.bio, 1200),
      },
      include: {
        patient: true,
        psychologist: true,
      },
    });

    if (updatedUser.role === "PSYCHOLOGIST" && updatedUser.psychologist) {
      await prisma.psychologist.update({
        where: { id: updatedUser.psychologist.id },
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
      await prisma.patient.update({
        where: { id: updatedUser.patient.id },
        data: {
          socialName: cleanText(body.socialName, 120),
          birthDate: parseBirthDate(body.birthDate),
          contactPreference: cleanText(body.contactPreference, 250),
          emergencyContactName: cleanText(body.emergencyContactName, 120),
          emergencyContactPhone,
          patientNotes: cleanText(body.patientNotes, 1200),
        },
      });
    }

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
