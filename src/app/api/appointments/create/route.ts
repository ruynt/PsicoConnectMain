import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { sendAppointmentCreatedEmail } from "../../../../lib/emails";

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

async function createGoogleEvent(accessToken: string, payload: any) {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const data = await response.json();

  return { response, data };
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

    const {
      title,
      date,
      startTime,
      endTime,
      location,
      description,
      patientId,
    } = body;

    if (!title || !date || !startTime || !endTime || !patientId) {
      return NextResponse.json(
        {
          error:
            "Título, paciente, data, hora inicial e hora final são obrigatórios.",
        },
        { status: 400 },
      );
    }

    const startDateTime = new Date(`${date}T${startTime}:00-03:00`);
    const endDateTime = new Date(`${date}T${endTime}:00-03:00`);

    if (endDateTime <= startDateTime) {
      return NextResponse.json(
        { error: "A hora final deve ser maior que a hora inicial." },
        { status: 400 },
      );
    }

    const psychologist = await prisma.psychologist.findUnique({
      where: {
        userId: String(token.id),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!psychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado para este usuário." },
        { status: 404 },
      );
    }

    const googleAccessToken = await getValidGoogleAccessToken(psychologist);

    if (!googleAccessToken) {
      return NextResponse.json(
        {
          error:
            "Google Calendar não conectado. Conecte sua agenda antes de criar uma consulta sincronizada.",
        },
        { status: 401 },
      );
    }

    const patient = await prisma.patient.findUnique({
      where: {
        id: patientId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        psychologistLinks: {
          where: {
            psychologistId: psychologist.id,
            active: true,
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

    if (patient.psychologistLinks.length === 0) {
      return NextResponse.json(
        { error: "Este paciente não está vinculado a você." },
        { status: 403 },
      );
    }

    const googlePayload = {
      summary: title,
      description:
        description ||
        `Consulta vinculada ao paciente ${patient.user.name} no PsicoConnect.`,
      location: location || "",
      start: {
        dateTime: `${date}T${startTime}:00`,
        timeZone: "America/Fortaleza",
      },
      end: {
        dateTime: `${date}T${endTime}:00`,
        timeZone: "America/Fortaleza",
      },
    };

    let { response, data } = await createGoogleEvent(
      googleAccessToken,
      googlePayload,
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

      ({ response, data } = await createGoogleEvent(
        refreshed.accessToken,
        googlePayload,
      ));
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message || "Erro ao criar evento no Google Calendar.",
          details: data,
        },
        { status: response.status },
      );
    }

    await prisma.psychologistPatient.upsert({
      where: {
        psychologistId_patientId: {
          psychologistId: psychologist.id,
          patientId: patient.id,
        },
      },
      update: {
        active: true,
      },
      create: {
        psychologistId: psychologist.id,
        patientId: patient.id,
        active: true,
      },
    });

    const appointment = await prisma.appointment.create({
      data: {
        title,
        description: description || "",
        location: location || "",
        dateTime: startDateTime,
        endDateTime,
        googleEventId: data.id,
        googleEventLink: data.htmlLink || "",
        patientId: patient.id,
        psychologistId: psychologist.id,
      },
    });

    let emailWarning: string | null = null;

    try {
      await sendAppointmentCreatedEmail({
        patientEmail: patient.user.email,
        patientName: patient.user.name,
        psychologistName: psychologist.user.name,
        title: appointment.title || "Consulta",
        startDateTime: appointment.dateTime,
        endDateTime: appointment.endDateTime,
        location: appointment.location,
        description: appointment.description,
        googleEventLink: appointment.googleEventLink,
      });
    } catch (emailError) {
      console.error(
        "Consulta criada, mas falhou ao enviar e-mail:",
        emailError,
      );

      emailWarning =
        "Consulta criada, mas não foi possível enviar o e-mail ao paciente.";
    }

    return NextResponse.json({
      message: emailWarning
        ? "Consulta criada com sucesso, mas houve falha no envio do e-mail."
        : "Consulta criada com sucesso.",
      appointment,
      googleEvent: data,
      emailWarning,
    });
  } catch (error: any) {
    console.error("Erro ao criar consulta:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao criar consulta.",
      },
      { status: 500 },
    );
  }
}
