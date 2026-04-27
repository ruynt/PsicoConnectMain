import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return NextResponse.json(
      { error: "Acesso não autorizado.", events: [] },
      { status: 403 },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") || "SCHEDULED";

    const psychologist = await prisma.psychologist.findUnique({
      where: {
        userId: String(token.id),
      },
    });

    if (!psychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado.", events: [] },
        { status: 404 },
      );
    }

    const now = new Date();

    const statusFilter =
      statusParam === "ALL"
        ? {}
        : {
            status: statusParam === "CANCELLED" ? "CANCELLED" : "SCHEDULED",
          };

    const dateFilter =
      statusParam === "CANCELLED" || statusParam === "ALL"
        ? {}
        : {
            dateTime: {
              gte: now,
            },
          };

    const appointments = await prisma.appointment.findMany({
      where: {
        psychologistId: psychologist.id,
        ...statusFilter,
        ...dateFilter,
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        dateTime: "asc",
      },
      take: 30,
    });

    const events = appointments.map((appointment) => ({
      id: appointment.id,
      appointmentId: appointment.id,
      title: appointment.title || "Consulta",
      description: appointment.description || "",
      start: appointment.dateTime.toISOString(),
      end: appointment.endDateTime?.toISOString() || null,
      location: appointment.location || "",
      htmlLink: appointment.googleEventLink || "",
      status: appointment.status,
      patientId: appointment.patientId,
      patientName: appointment.patient.user.name,
      patientEmail: appointment.patient.user.email,
      googleEventId: appointment.googleEventId || "",
    }));

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("Erro ao listar consultas:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao listar consultas.",
        events: [],
      },
      { status: 500 },
    );
  }
}
