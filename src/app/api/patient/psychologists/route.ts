import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

async function getAuthenticatedPatient(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado.", psychologists: [] },
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
        { error: "Paciente não encontrado.", psychologists: [] },
        { status: 404 },
      ),
    };
  }

  return {
    patient,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedPatient(req);

    if (auth.error) {
      return auth.error;
    }

    const links = await prisma.psychologistPatient.findMany({
      where: {
        patientId: auth.patient.id,
        active: true,
      },
      select: {
        id: true,
        createdAt: true,
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
        createdAt: "desc",
      },
    });

    const psychologists = links.map((link) => {
      const psychologist = link.psychologist;

      return {
        id: psychologist.id,
        linkId: link.id,

        name: psychologist.user.name,
        email: psychologist.user.email,
        profileImageUrl: psychologist.user.profileImageUrl || "",
        phone: psychologist.user.phone || "",
        city: psychologist.user.city || "",
        state: psychologist.user.state || "",
        bio: psychologist.user.bio || "",

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

        linkedAt: link.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      psychologists,
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
      },
      { status: 500 },
    );
  }
}
