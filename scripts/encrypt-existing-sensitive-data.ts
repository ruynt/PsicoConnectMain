import prisma from "../src/lib/prisma";
import {
  encryptNullableSensitiveText,
  encryptSensitiveText,
  isEncryptedText,
} from "../src/lib/encryption";

type NullableText = string | null | undefined;

type TableReport = {
  table: string;
  scanned: number;
  updated: number;
};

const isDryRun = process.argv.includes("--dry-run");

function encryptNullable(value: NullableText) {
  if (!value) {
    return value ?? null;
  }

  return encryptNullableSensitiveText(value);
}

function encryptRequired(value: string) {
  return encryptSensitiveText(value);
}

function hasEncryptedChange(original: NullableText, encrypted: NullableText) {
  return original !== encrypted;
}

async function updatePsychologistGoogleTokens() {
  const rows = await prisma.psychologist.findMany({
    select: {
      id: true,
      googleAccessToken: true,
      googleRefreshToken: true,
    },
  });

  let updated = 0;

  for (const row of rows) {
    const data = {
      googleAccessToken: encryptNullable(row.googleAccessToken),
      googleRefreshToken: encryptNullable(row.googleRefreshToken),
    };

    if (
      !hasEncryptedChange(row.googleAccessToken, data.googleAccessToken) &&
      !hasEncryptedChange(row.googleRefreshToken, data.googleRefreshToken)
    ) {
      continue;
    }

    updated += 1;

    if (!isDryRun) {
      await prisma.psychologist.update({
        where: { id: row.id },
        data,
      });
    }
  }

  return {
    table: "PsychologistGoogleTokens",
    scanned: rows.length,
    updated,
  } satisfies TableReport;
}

async function updateUsers() {
  const rows = await prisma.user.findMany({
    select: {
      id: true,
      phone: true,
      bio: true,
    },
  });

  let updated = 0;

  for (const row of rows) {
    const data = {
      phone: encryptNullable(row.phone),
      bio: encryptNullable(row.bio),
    };

    if (!hasEncryptedChange(row.phone, data.phone) && !hasEncryptedChange(row.bio, data.bio)) {
      continue;
    }

    updated += 1;

    if (!isDryRun) {
      await prisma.user.update({
        where: { id: row.id },
        data,
      });
    }
  }

  return { table: "User", scanned: rows.length, updated } satisfies TableReport;
}

async function updatePatients() {
  const rows = await prisma.patient.findMany({
    select: {
      id: true,
      socialName: true,
      contactPreference: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      patientNotes: true,
    },
  });

  let updated = 0;

  for (const row of rows) {
    const data = {
      socialName: encryptNullable(row.socialName),
      contactPreference: encryptNullable(row.contactPreference),
      emergencyContactName: encryptNullable(row.emergencyContactName),
      emergencyContactPhone: encryptNullable(row.emergencyContactPhone),
      patientNotes: encryptNullable(row.patientNotes),
    };

    if (
      !hasEncryptedChange(row.socialName, data.socialName) &&
      !hasEncryptedChange(row.contactPreference, data.contactPreference) &&
      !hasEncryptedChange(row.emergencyContactName, data.emergencyContactName) &&
      !hasEncryptedChange(row.emergencyContactPhone, data.emergencyContactPhone) &&
      !hasEncryptedChange(row.patientNotes, data.patientNotes)
    ) {
      continue;
    }

    updated += 1;

    if (!isDryRun) {
      await prisma.patient.update({
        where: { id: row.id },
        data,
      });
    }
  }

  return { table: "Patient", scanned: rows.length, updated } satisfies TableReport;
}

async function updateAppointments() {
  const rows = await prisma.appointment.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      cancellationReason: true,
      cancellationRequestReason: true,
      paymentNote: true,
    },
  });

  let updated = 0;

  for (const row of rows) {
    const data = {
      title: encryptNullable(row.title),
      description: encryptNullable(row.description),
      location: encryptNullable(row.location),
      cancellationReason: encryptNullable(row.cancellationReason),
      cancellationRequestReason: encryptNullable(row.cancellationRequestReason),
      paymentNote: encryptNullable(row.paymentNote),
    };

    if (
      !hasEncryptedChange(row.title, data.title) &&
      !hasEncryptedChange(row.description, data.description) &&
      !hasEncryptedChange(row.location, data.location) &&
      !hasEncryptedChange(row.cancellationReason, data.cancellationReason) &&
      !hasEncryptedChange(row.cancellationRequestReason, data.cancellationRequestReason) &&
      !hasEncryptedChange(row.paymentNote, data.paymentNote)
    ) {
      continue;
    }

    updated += 1;

    if (!isDryRun) {
      await prisma.appointment.update({
        where: { id: row.id },
        data,
      });
    }
  }

  return { table: "Appointment", scanned: rows.length, updated } satisfies TableReport;
}

async function updatePreSessionCheckins() {
  const rows = await prisma.preSessionCheckin.findMany({
    select: {
      id: true,
      mainConcern: true,
      importantEvents: true,
      topicsToDiscuss: true,
    },
  });

  let updated = 0;

  for (const row of rows) {
    const data = {
      mainConcern: encryptNullable(row.mainConcern),
      importantEvents: encryptNullable(row.importantEvents),
      topicsToDiscuss: encryptNullable(row.topicsToDiscuss),
    };

    if (
      !hasEncryptedChange(row.mainConcern, data.mainConcern) &&
      !hasEncryptedChange(row.importantEvents, data.importantEvents) &&
      !hasEncryptedChange(row.topicsToDiscuss, data.topicsToDiscuss)
    ) {
      continue;
    }

    updated += 1;

    if (!isDryRun) {
      await prisma.preSessionCheckin.update({
        where: { id: row.id },
        data,
      });
    }
  }

  return { table: "PreSessionCheckin", scanned: rows.length, updated } satisfies TableReport;
}

async function updateTherapeuticTasks() {
  const rows = await prisma.therapeuticTask.findMany({
    select: {
      id: true,
      title: true,
      description: true,
    },
  });

  let updated = 0;

  for (const row of rows) {
    const data = {
      title: isEncryptedText(row.title) ? row.title : encryptRequired(row.title),
      description: encryptNullable(row.description),
    };

    if (!hasEncryptedChange(row.title, data.title) && !hasEncryptedChange(row.description, data.description)) {
      continue;
    }

    updated += 1;

    if (!isDryRun) {
      await prisma.therapeuticTask.update({
        where: { id: row.id },
        data,
      });
    }
  }

  return { table: "TherapeuticTask", scanned: rows.length, updated } satisfies TableReport;
}

async function updatePatientMaterials() {
  const rows = await prisma.patientMaterial.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      url: true,
      content: true,
    },
  });

  let updated = 0;

  for (const row of rows) {
    const data = {
      title: isEncryptedText(row.title) ? row.title : encryptRequired(row.title),
      description: encryptNullable(row.description),
      category: encryptNullable(row.category),
      url: encryptNullable(row.url),
      content: encryptNullable(row.content),
    };

    if (
      !hasEncryptedChange(row.title, data.title) &&
      !hasEncryptedChange(row.description, data.description) &&
      !hasEncryptedChange(row.category, data.category) &&
      !hasEncryptedChange(row.url, data.url) &&
      !hasEncryptedChange(row.content, data.content)
    ) {
      continue;
    }

    updated += 1;

    if (!isDryRun) {
      await prisma.patientMaterial.update({
        where: { id: row.id },
        data,
      });
    }
  }

  return { table: "PatientMaterial", scanned: rows.length, updated } satisfies TableReport;
}

async function updatePatientMessages() {
  const rows = await prisma.patientMessage.findMany({
    select: {
      id: true,
      content: true,
    },
  });

  let updated = 0;

  for (const row of rows) {
    const data = {
      content: isEncryptedText(row.content) ? row.content : encryptRequired(row.content),
    };

    if (!hasEncryptedChange(row.content, data.content)) {
      continue;
    }

    updated += 1;

    if (!isDryRun) {
      await prisma.patientMessage.update({
        where: { id: row.id },
        data,
      });
    }
  }

  return { table: "PatientMessage", scanned: rows.length, updated } satisfies TableReport;
}

async function updateSessionNotes() {
  const rows = await prisma.sessionNote.findMany({
    select: {
      id: true,
      title: true,
      content: true,
    },
  });

  let updated = 0;

  for (const row of rows) {
    const data = {
      title: encryptNullable(row.title),
      content: isEncryptedText(row.content) ? row.content : encryptRequired(row.content),
    };

    if (!hasEncryptedChange(row.title, data.title) && !hasEncryptedChange(row.content, data.content)) {
      continue;
    }

    updated += 1;

    if (!isDryRun) {
      await prisma.sessionNote.update({
        where: { id: row.id },
        data,
      });
    }
  }

  return { table: "SessionNote", scanned: rows.length, updated } satisfies TableReport;
}

async function updatePatientSummaries() {
  const rows = await prisma.patientSummary.findMany({
    select: {
      id: true,
      title: true,
      content: true,
    },
  });

  let updated = 0;

  for (const row of rows) {
    const data = {
      title: encryptNullable(row.title),
      content: isEncryptedText(row.content) ? row.content : encryptRequired(row.content),
    };

    if (!hasEncryptedChange(row.title, data.title) && !hasEncryptedChange(row.content, data.content)) {
      continue;
    }

    updated += 1;

    if (!isDryRun) {
      await prisma.patientSummary.update({
        where: { id: row.id },
        data,
      });
    }
  }

  return { table: "PatientSummary", scanned: rows.length, updated } satisfies TableReport;
}

async function main() {
  console.log(
    isDryRun
      ? "🔎 Simulação: nenhum dado será alterado."
      : "🔐 Iniciando criptografia dos dados sensíveis antigos.",
  );

  const reports: TableReport[] = [];

  reports.push(await updatePsychologistGoogleTokens());
  reports.push(await updateUsers());
  reports.push(await updatePatients());
  reports.push(await updateAppointments());
  reports.push(await updatePreSessionCheckins());
  reports.push(await updateTherapeuticTasks());
  reports.push(await updatePatientMaterials());
  reports.push(await updatePatientMessages());
  reports.push(await updateSessionNotes());
  reports.push(await updatePatientSummaries());

  console.table(reports);

  const totalUpdated = reports.reduce(
    (sum, report) => sum + report.updated,
    0,
  );

  console.log(
    isDryRun
      ? `Simulação concluída. ${totalUpdated} registro(s) seriam atualizados.`
      : `Migração concluída. ${totalUpdated} registro(s) atualizado(s).`,
  );
}

main()
  .catch((error) => {
    console.error("Erro ao criptografar dados antigos:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
