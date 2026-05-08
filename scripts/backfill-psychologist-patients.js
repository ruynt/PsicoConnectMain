const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando backfill de vínculos psicólogo-paciente...");

  const appointments = await prisma.appointment.findMany({
    select: {
      psychologistId: true,
      patientId: true,
    },
  });

  const uniqueLinks = new Map();

  for (const appointment of appointments) {
    const key = `${appointment.psychologistId}:${appointment.patientId}`;

    uniqueLinks.set(key, {
      psychologistId: appointment.psychologistId,
      patientId: appointment.patientId,
    });
  }

  let createdOrUpdated = 0;

  for (const link of uniqueLinks.values()) {
    await prisma.psychologistPatient.upsert({
      where: {
        psychologistId_patientId: {
          psychologistId: link.psychologistId,
          patientId: link.patientId,
        },
      },
      update: {
        active: true,
      },
      create: {
        psychologistId: link.psychologistId,
        patientId: link.patientId,
        active: true,
      },
    });

    createdOrUpdated++;
  }

  console.log(`Backfill concluído. Vínculos processados: ${createdOrUpdated}`);
}

main()
  .catch((error) => {
    console.error("Erro no backfill:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
