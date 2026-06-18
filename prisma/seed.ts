import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("12345678", 10);

  const psyUser = await prisma.user.upsert({
    where: { email: "dr.kay@example.com" },
    update: {},
    create: {
      name: "Dra. Kay",
      email: "dr.kay@example.com",
      passwordHash: password,
      role: "PSYCHOLOGIST",
    },
  });

  const psy = await prisma.psychologist.upsert({
    where: { userId: psyUser.id },
    update: {},
    create: {
      userId: psyUser.id,
      crp: "06/12345",
    },
  });

  const p1User = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      name: "Alice",
      email: "alice@example.com",
      passwordHash: password,
      role: "PATIENT",
    },
  });

  const p1 = await prisma.patient.upsert({
    where: { userId: p1User.id },
    update: {},
    create: { userId: p1User.id },
  });

  const p2User = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      name: "Bob",
      email: "bob@example.com",
      passwordHash: password,
      role: "PATIENT",
    },
  });

  const p2 = await prisma.patient.upsert({
    where: { userId: p2User.id },
    update: {},
    create: { userId: p2User.id },
  });

  const now = new Date();
  const today10 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0);
  const tomorrow15 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 15, 0);
  const in3days11 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 11, 0);

  await prisma.appointment.createMany({
    data: [
      {
        dateTime: today10,
        status: "SCHEDULED",
        patientId: p1.id,
        psychologistId: psy.id,
      },
      {
        dateTime: tomorrow15,
        status: "SCHEDULED",
        patientId: p1.id,
        psychologistId: psy.id,
      },
      {
        dateTime: in3days11,
        status: "SCHEDULED",
        patientId: p2.id,
        psychologistId: psy.id,
      },
    ],
  });

  console.log("✅ Seed concluído com psicólogo, pacientes e consultas de exemplo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
