import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 403 },
    );
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: {
        userId: String(token.id),
      },
      include: {
        psychologistLinks: {
          where: {
            active: true,
          },
          include: {
            psychologist: {
              include: {
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
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Paciente não encontrado." },
        { status: 404 },
      );
    }

    const psychologists = patient.psychologistLinks.map((link) => {
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
  } catch (error: any) {
    console.error("Erro ao buscar psicólogos do paciente:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Erro interno ao buscar psicólogos vinculados.",
      },
      { status: 500 },
    );
  }
}