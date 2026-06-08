import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return NextResponse.json(
      { error: "Acesso não autorizado.", patients: [] },
      { status: 403 },
    );
  }

  try {
    const psychologist = await prisma.psychologist.findUnique({
      where: {
        userId: String(token.id),
      },
    });

    if (!psychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado.", patients: [] },
        { status: 404 },
      );
    }

    const now = new Date();

    const patients = await prisma.patient.findMany({
      where: {
        psychologistLinks: {
          some: {
            psychologistId: psychologist.id,
            active: true,
          },
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            profileImageUrl: true,
            phone: true,
            city: true,
            state: true,
          },
        },
        appointments: {
          where: {
            psychologistId: psychologist.id,
          },
          orderBy: {
            dateTime: "asc",
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    const formattedPatients = patients.map((patient) => {
      const scheduledAppointments = patient.appointments.filter(
        (appointment) => appointment.status === "SCHEDULED",
      );

      const cancelledAppointments = patient.appointments.filter(
        (appointment) => appointment.status === "CANCELLED",
      );

      const nextAppointment = scheduledAppointments.find(
        (appointment) => appointment.dateTime >= now,
      );

      return {
        id: patient.id,
        name: patient.socialName?.trim() || patient.user.name,
        civilName: patient.user.name,
        socialName: patient.socialName,
        email: patient.user.email,
        profileImageUrl: patient.user.profileImageUrl,
        phone: patient.user.phone,
        city: patient.user.city,
        state: patient.user.state,
        totalAppointments: patient.appointments.length,
        scheduledAppointments: scheduledAppointments.length,
        cancelledAppointments: cancelledAppointments.length,
        nextAppointment: nextAppointment
          ? {
              id: nextAppointment.id,
              title: nextAppointment.title || "Consulta",
              dateTime: nextAppointment.dateTime.toISOString(),
              endDateTime: nextAppointment.endDateTime?.toISOString() || null,
              status: nextAppointment.status,
            }
          : null,
      };
    });

    return NextResponse.json({
      patients: formattedPatients,
    });
  } catch (error: unknown) {
    console.error("Erro ao listar pacientes:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao listar pacientes."),
        patients: [],
      },
      { status: 500 },
    );
  }
}