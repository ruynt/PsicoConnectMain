import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { sendAppointmentCancelledEmail } from "../../../../lib/emails";

async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error_description ||
        data?.error ||
        "Erro ao renovar token do Google.",
    );
  }

  return {
    accessToken: data.access_token as string,
    expiresAt: new Date(Date.now() + Number(data.expires_in || 3600) * 1000),
  };
}

async function deleteGoogleEvent(accessToken: string, googleEventId: string) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (response.status === 204) {
    return {
      response,
      data: null,
    };
  }

  const text = await response.text();

  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return {
    response,
    data,
  };
}

async function getValidGoogleAccessToken(psychologist: {
  id: string;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleAccessTokenExpires: Date | null;
}) {
  const expiresAt = psychologist.googleAccessTokenExpires?.getTime() || 0;
  const tokenIsValid =
    psychologist.googleAccessToken && expiresAt > Date.now() + 60 * 1000;

  if (tokenIsValid) {
    return psychologist.googleAccessToken as string;
  }

  if (!psychologist.googleRefreshToken) {
    return null;
  }

  const refreshed = await refreshGoogleAccessToken(
    psychologist.googleRefreshToken,
  );

  await prisma.psychologist.update({
    where: {
      id: psychologist.id,
    },
    data: {
      googleAccessToken: refreshed.accessToken,
      googleAccessTokenExpires: refreshed.expiresAt,
    },
  });

  return refreshed.accessToken;
}

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const { appointmentId, cancellationReason } = body;

    const normalizedCancellationReason =
      typeof cancellationReason === "string" ? cancellationReason.trim() : "";

    if (!appointmentId) {
      return NextResponse.json(
        { error: "ID da consulta é obrigatório." },
        { status: 400 },
      );
    }

    const psychologist = await prisma.psychologist.findUnique({
      where: {
        userId: String(token.id),
      },
    });

    if (!psychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado para este usuário." },
        { status: 404 },
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
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
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Consulta não encontrada." },
        { status: 404 },
      );
    }

    if (appointment.psychologistId !== psychologist.id) {
      return NextResponse.json(
        { error: "Você não tem permissão para cancelar esta consulta." },
        { status: 403 },
      );
    }

    if (appointment.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Esta consulta já está cancelada." },
        { status: 400 },
      );
    }

    if (appointment.googleEventId) {
      const googleAccessToken = await getValidGoogleAccessToken(psychologist);

      if (googleAccessToken) {
        let { response, data } = await deleteGoogleEvent(
          googleAccessToken,
          appointment.googleEventId,
        );

        if (response.status === 401 && psychologist.googleRefreshToken) {
          const refreshed = await refreshGoogleAccessToken(
            psychologist.googleRefreshToken,
          );

          await prisma.psychologist.update({
            where: {
              id: psychologist.id,
            },
            data: {
              googleAccessToken: refreshed.accessToken,
              googleAccessTokenExpires: refreshed.expiresAt,
            },
          });

          ({ response, data } = await deleteGoogleEvent(
            refreshed.accessToken,
            appointment.googleEventId,
          ));
        }

        if (!response.ok && response.status !== 404) {
          return NextResponse.json(
            {
              error:
                data?.error?.message ||
                "Erro ao cancelar evento no Google Calendar.",
              details: data,
            },
            { status: response.status },
          );
        }
      }
    }

    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: appointment.id,
      },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: normalizedCancellationReason || null,
      },
    });

    let emailWarning: string | null = null;

    try {
      await sendAppointmentCancelledEmail({
        patientEmail: appointment.patient.user.email,
        patientName: appointment.patient.user.name,
        psychologistName: appointment.psychologist.user.name,
        title: appointment.title || "Consulta",
        startDateTime: appointment.dateTime,
        endDateTime: appointment.endDateTime,
        location: appointment.location,
        cancellationReason: normalizedCancellationReason || null,
      });
    } catch (emailError) {
      console.error(
        "Consulta cancelada, mas falhou ao enviar e-mail:",
        emailError,
      );

      emailWarning =
        "Consulta cancelada, mas não foi possível enviar o e-mail ao paciente.";
    }

    return NextResponse.json({
      message: emailWarning
        ? "Consulta cancelada com sucesso, mas houve falha no envio do e-mail."
        : "Consulta cancelada com sucesso. O paciente foi notificado por e-mail.",
      appointment: updatedAppointment,
      emailWarning,
    });
  } catch (error: any) {
    console.error("Erro ao cancelar consulta:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao cancelar consulta.",
      },
      { status: 500 },
    );
  }
}
