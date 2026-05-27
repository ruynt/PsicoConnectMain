import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "../../../../lib/prisma";
import { sendAppointmentReminderEmail } from "../../../../lib/emails";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

async function runAppointmentReminders(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 401 },
      );
    }

    const now = new Date();

    const windowStart = new Date(now);
    windowStart.setHours(windowStart.getHours() + 23);

    const windowEnd = new Date(now);
    windowEnd.setHours(windowEnd.getHours() + 25);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: "SCHEDULED",
        dateTime: {
          gte: windowStart,
          lte: windowEnd,
        },
        reminderEmailSentAt: null,
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
        psychologist: {
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
    });

    const results = [];

    for (const appointment of appointments) {
      try {
        await sendAppointmentReminderEmail({
          patientEmail: appointment.patient.user.email,
          patientName: appointment.patient.user.name,
          psychologistName: appointment.psychologist.user.name,
          title: appointment.title || "Consulta",
          startDateTime: appointment.dateTime,
          endDateTime: appointment.endDateTime,
          location: appointment.location || "",
          description: appointment.description || "",
          googleEventLink: appointment.googleEventLink || "",
        });

        const sentAt = new Date();

        await prisma.appointment.update({
          where: {
            id: appointment.id,
          },
          data: {
            reminderEmailSentAt: sentAt,
            lastReminderSentAt: sentAt,
          },
        });

        results.push({
          appointmentId: appointment.id,
          patientName: appointment.patient.user.name,
          patientEmail: appointment.patient.user.email,
          dateTime: appointment.dateTime.toISOString(),
          status: "SENT",
        });
      } catch (error: any) {
        console.error(
          `Erro ao enviar lembrete da consulta ${appointment.id}:`,
          error,
        );

        results.push({
          appointmentId: appointment.id,
          patientName: appointment.patient.user.name,
          patientEmail: appointment.patient.user.email,
          dateTime: appointment.dateTime.toISOString(),
          status: "ERROR",
          error: error?.message || "Erro desconhecido ao enviar lembrete.",
        });
      }
    }

    return NextResponse.json({
      message: "Rotina de lembretes executada.",
      now: now.toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      windowStartFormatted: formatDateTime(windowStart),
      windowEndFormatted: formatDateTime(windowEnd),
      checked: appointments.length,
      sent: results.filter((item) => item.status === "SENT").length,
      errors: results.filter((item) => item.status === "ERROR").length,
      results,
    });
  } catch (error: any) {
    console.error("Erro na rotina de lembretes automáticos:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erro interno ao executar rotina de lembretes automáticos.",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return runAppointmentReminders(req);
}

export async function POST(req: NextRequest) {
  return runAppointmentReminders(req);
}
