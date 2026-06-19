import { NextResponse } from "next/server";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { sendAppointmentCancelledEmail } from "../../../../lib/emails";
import { getErrorMessage, getExternalApiErrorMessage } from "@/lib/errorUtils";
import { decryptNullableSensitiveText, encryptNullableSensitiveText } from "@/lib/encryption";
import { decryptGoogleToken, encryptGoogleToken } from "@/lib/google-calendar-tokens";
import {
  optionalTrimmedString,
  parseJsonBody,
  requiredUuidString,
} from "@/lib/api-validation";

const cancelAppointmentSchema = z.object({
  appointmentId: requiredUuidString(
    "ID da consulta é obrigatório.",
    "ID da consulta inválido.",
  ),
  cancellationReason: optionalTrimmedString(
    1000,
    "O motivo do cancelamento deve ter no máximo 1000 caracteres.",
  ),
});

function getAppointmentEndReference(appointment: {
  dateTime: Date;
  endDateTime: Date | null;
}) {
  return appointment.endDateTime || appointment.dateTime;
}

function isAppointmentCompleted(appointment: {
  dateTime: Date;
  endDateTime: Date | null;
  status: string;
}) {
  return (
    appointment.status !== "CANCELLED" &&
    getAppointmentEndReference(appointment).getTime() < Date.now()
  );
}

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

  let data: unknown = {};
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
  const accessToken = decryptGoogleToken(psychologist.googleAccessToken);
  const refreshToken = decryptGoogleToken(psychologist.googleRefreshToken);
  const expiresAt = psychologist.googleAccessTokenExpires?.getTime() || 0;
  const tokenIsValid = accessToken && expiresAt > Date.now() + 60 * 1000;

  if (tokenIsValid) {
    return accessToken;
  }

  if (!refreshToken) {
    return null;
  }

  const refreshed = await refreshGoogleAccessToken(refreshToken);

  await prisma.psychologist.update({
    where: {
      id: psychologist.id,
    },
    data: {
      googleAccessToken: encryptGoogleToken(refreshed.accessToken),
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
    const parsedBody = await parseJsonBody(req, cancelAppointmentSchema);

    if (parsedBody.error) {
      return parsedBody.error;
    }

    const body = parsedBody.data;
    const appointmentId = body.appointmentId;
    const cancellationReason = body.cancellationReason;

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
      select: {
        id: true,
        googleAccessToken: true,
        googleRefreshToken: true,
        googleAccessTokenExpires: true,
      },
    });

    if (!psychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado para este usuário." },
        { status: 404 },
      );
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        psychologistId: psychologist.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        dateTime: true,
        endDateTime: true,
        googleEventId: true,
        status: true,
        patient: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        psychologist: {
          select: {
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
        { error: "Consulta não encontrada ou sem permissão de acesso." },
        { status: 404 },
      );
    }

    if (appointment.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Esta consulta já está cancelada." },
        { status: 400 },
      );
    }

    if (isAppointmentCompleted(appointment)) {
      return NextResponse.json(
        { error: "Não é possível cancelar uma consulta finalizada." },
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

        const refreshToken = decryptGoogleToken(psychologist.googleRefreshToken);

        if (response.status === 401 && refreshToken) {
          const refreshed = await refreshGoogleAccessToken(refreshToken);

          await prisma.psychologist.update({
            where: {
              id: psychologist.id,
            },
            data: {
              googleAccessToken: encryptGoogleToken(refreshed.accessToken),
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
              error: getExternalApiErrorMessage(
                data,
                "Erro ao cancelar evento no Google Calendar.",
              ),
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
        cancellationReason: encryptNullableSensitiveText(cancellationReason) || null,
      },
    });

    let emailWarning: string | null = null;

    try {
      await sendAppointmentCancelledEmail({
        patientEmail: appointment.patient.user.email,
        patientName: appointment.patient.user.name,
        psychologistName: appointment.psychologist.user.name,
        title: decryptNullableSensitiveText(appointment.title) || "Consulta",
        startDateTime: appointment.dateTime,
        endDateTime: appointment.endDateTime,
        location: decryptNullableSensitiveText(appointment.location),
        cancellationReason: cancellationReason || null,
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
      appointment: {
        ...updatedAppointment,
        title: decryptNullableSensitiveText(updatedAppointment.title),
        description: decryptNullableSensitiveText(updatedAppointment.description),
        location: decryptNullableSensitiveText(updatedAppointment.location),
        cancellationReason: decryptNullableSensitiveText(
          updatedAppointment.cancellationReason,
        ),
      },
      emailWarning,
    });
  } catch (error: unknown) {
    console.error("Erro ao cancelar consulta:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao cancelar consulta."),
      },
      { status: 500 },
    );
  }
}
