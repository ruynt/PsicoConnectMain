import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Atualizando nomes das contas demo...");

  await prisma.user.updateMany({
    where: {
      email: "psicologo.pedro@psicoconnect.demo",
    },
    data: {
      name: "Dr. Pedro Vieira",
    },
  });

  await prisma.user.updateMany({
    where: {
      email: "psicologa.kay@psicoconnect.demo",
    },
    data: {
      name: "Dra. Helena Martins",
      email: "psicologa.helena@psicoconnect.demo",
    },
  });

  console.log("Nomes atualizados com sucesso!");
  console.log("");
  console.log("Psicólogo 1:");
  console.log("Dr. Pedro Vieira");
  console.log("E-mail: psicologo.pedro@psicoconnect.demo");
  console.log("");
  console.log("Psicóloga 2:");
  console.log("Dra. Helena Martins");
  console.log("E-mail: psicologa.helena@psicoconnect.demo");
}

main()
  .catch((error) => {
    console.error("Erro ao atualizar nomes demo:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
