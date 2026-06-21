import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";
import { decryptNullableSensitiveText } from "@/lib/encryption";

async function getAuthenticatedPatient(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado.", psychologists: [], pendingRequests: [] },
        { status: 403 },
      ),
    };
  }

  const patient = await prisma.patient.findUnique({
    where: {
      userId: String(token.id),
    },
    select: {
      id: true,
    },
  });

  if (!patient) {
    return {
      error: NextResponse.json(
        { error: "Paciente não encontrado.", psychologists: [], pendingRequests: [] },
        { status: 404 },
      ),
    };
  }

  return {
    patient,
  };
}

function getLinks(patientId: string) {
  return prisma.psychologistPatient.findMany({
    where: {
      patientId,
      status: {
        in: ["PENDING", "APPROVED"],
      },
    },
    select: {
      id: true,
      status: true,
      active: true,
      createdAt: true,
      requestedAt: true,
      respondedAt: true,
      psychologist: {
        select: {
          id: true,
          crp: true,
          crpState: true,
          crpRegion: true,
          crpNumber: true,
          professionalTitle: true,
          approach: true,
          specialties: true,
          education: true,
          targetAudience: true,
          instagramUrl: true,
          user: {
            select: {
              name: true,
              email: true,
              profileImageUrl: true,
              phone: true,
              city: true,
              state: true,
              bio: true,
            },
          },
        },
      },
    },
    orderBy: {
      requestedAt: "desc",
    },
  });
}

type PsychologistLink = Awaited<ReturnType<typeof getLinks>>[number];

function mapPsychologistFromLink(link: PsychologistLink) {
  const psychologist = link.psychologist;

  return {
    id: psychologist.id,
    linkId: link.id,

    name: psychologist.user.name,
    email: psychologist.user.email,
    profileImageUrl: psychologist.user.profileImageUrl || "",
    phone: decryptNullableSensitiveText(psychologist.user.phone),
    city: psychologist.user.city || "",
    state: psychologist.user.state || "",
    bio: decryptNullableSensitiveText(psychologist.user.bio),

    crp: psychologist.crp,
    crpState: psychologist.crpState || "",
    crpRegion: psychologist.crpRegion || "",
    crpNumber: psychologist.crpNumber || "",

    professionalTitle: psychologist.professionalTitle || "",
    approach: psychologist.approach || "",
    specialties: psychologist.specialties || "",
    education: psychologist.education || "",
    targetAudience: psychologist.targetAudience || "",
    instagramUrl: psychologist.instagramUrl || "",

    linkedAt: (link.respondedAt || link.createdAt).toISOString(),
    requestedAt: link.requestedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedPatient(req);

    if (auth.error) {
      return auth.error;
    }

    const links = await getLinks(auth.patient.id);

    const approvedLinks = links.filter(
      (link) => link.active && link.status === "APPROVED",
    );

    const pendingLinks = links.filter((link) => link.status === "PENDING");

    return NextResponse.json({
      psychologists: approvedLinks.map(mapPsychologistFromLink),
      pendingRequests: pendingLinks.map(mapPsychologistFromLink),
    });
  } catch (error: unknown) {
    console.error("Erro ao buscar psicólogos do paciente:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro interno ao buscar psicólogos vinculados.",
        ),
        psychologists: [],
        pendingRequests: [],
      },
      { status: 500 },
    );
  }
}
