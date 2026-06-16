import { PrismaClient } from "@prisma/client";
import {
  createCipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const prisma = new PrismaClient();
const ENCRYPTION_PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const SHOULD_WRITE = process.env.CONFIRM_ENCRYPT_EXISTING_DATA === "true";

function toBase64Url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function isProbablyHexKey(value) {
  return /^[a-f0-9]{64}$/i.test(value);
}

function getEncryptionKey() {
  const rawKey = process.env.DATA_ENCRYPTION_KEY?.trim();

  if (!rawKey) {
    throw new Error("DATA_ENCRYPTION_KEY não configurada.");
  }

  if (isProbablyHexKey(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }

  const base64Candidate = Buffer.from(rawKey, "base64");

  if (base64Candidate.length === KEY_LENGTH) {
    return base64Candidate;
  }

  if (Buffer.byteLength(rawKey, "utf8") >= KEY_LENGTH) {
    return createHash("sha256").update(rawKey).digest();
  }

  throw new Error(
    "DATA_ENCRYPTION_KEY inválida. Gere uma chave com: openssl rand -base64 32",
  );
}

function isEncryptedText(value) {
  return typeof value === "string" && value.startsWith(ENCRYPTION_PREFIX);
}

function encryptSensitiveText(value) {
  if (!value || isEncryptedText(value)) {
    return value;
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${toBase64Url(iv)}:${toBase64Url(authTag)}:${toBase64Url(encrypted)}`;
}

async function updatePatientMessages() {
  const records = await prisma.patientMessage.findMany({
    select: { id: true, content: true },
  });

  const pending = records.filter((record) => !isEncryptedText(record.content));

  if (SHOULD_WRITE) {
    for (const record of pending) {
      await prisma.patientMessage.update({
        where: { id: record.id },
        data: { content: encryptSensitiveText(record.content) },
      });
    }
  }

  return pending.length;
}

async function updateSessionNotes() {
  const records = await prisma.sessionNote.findMany({
    select: { id: true, title: true, content: true },
  });

  const pending = records.filter(
    (record) =>
      !isEncryptedText(record.content) ||
      (record.title && !isEncryptedText(record.title)),
  );

  if (SHOULD_WRITE) {
    for (const record of pending) {
      await prisma.sessionNote.update({
        where: { id: record.id },
        data: {
          title: record.title ? encryptSensitiveText(record.title) : record.title,
          content: encryptSensitiveText(record.content),
        },
      });
    }
  }

  return pending.length;
}

async function updatePatientSummaries() {
  const records = await prisma.patientSummary.findMany({
    select: { id: true, title: true, content: true },
  });

  const pending = records.filter(
    (record) =>
      !isEncryptedText(record.content) ||
      (record.title && !isEncryptedText(record.title)),
  );

  if (SHOULD_WRITE) {
    for (const record of pending) {
      await prisma.patientSummary.update({
        where: { id: record.id },
        data: {
          title: record.title ? encryptSensitiveText(record.title) : record.title,
          content: encryptSensitiveText(record.content),
        },
      });
    }
  }

  return pending.length;
}

async function updatePreSessionCheckins() {
  const records = await prisma.preSessionCheckin.findMany({
    select: {
      id: true,
      mainConcern: true,
      importantEvents: true,
      topicsToDiscuss: true,
    },
  });

  const pending = records.filter(
    (record) =>
      (record.mainConcern && !isEncryptedText(record.mainConcern)) ||
      (record.importantEvents && !isEncryptedText(record.importantEvents)) ||
      (record.topicsToDiscuss && !isEncryptedText(record.topicsToDiscuss)),
  );

  if (SHOULD_WRITE) {
    for (const record of pending) {
      await prisma.preSessionCheckin.update({
        where: { id: record.id },
        data: {
          mainConcern: record.mainConcern
            ? encryptSensitiveText(record.mainConcern)
            : record.mainConcern,
          importantEvents: record.importantEvents
            ? encryptSensitiveText(record.importantEvents)
            : record.importantEvents,
          topicsToDiscuss: record.topicsToDiscuss
            ? encryptSensitiveText(record.topicsToDiscuss)
            : record.topicsToDiscuss,
        },
      });
    }
  }

  return pending.length;
}

async function main() {
  console.log(
    SHOULD_WRITE
      ? "Criptografando dados sensíveis existentes..."
      : "Modo simulação. Nenhum dado será alterado. Para executar de verdade, use CONFIRM_ENCRYPT_EXISTING_DATA=true.",
  );

  const [messages, notes, summaries, checkins] = await Promise.all([
    updatePatientMessages(),
    updateSessionNotes(),
    updatePatientSummaries(),
    updatePreSessionCheckins(),
  ]);

  console.log("Registros encontrados para criptografar:");
  console.log(`- Mensagens: ${messages}`);
  console.log(`- Anotações/prontuário: ${notes}`);
  console.log(`- Resumos: ${summaries}`);
  console.log(`- Checklists pré-sessão: ${checkins}`);

  if (!SHOULD_WRITE) {
    console.log("\nNenhuma alteração foi feita.");
  } else {
    console.log("\nCriptografia dos dados existentes concluída.");
  }
}

main()
  .catch((error) => {
    console.error("Falha ao criptografar dados existentes:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
