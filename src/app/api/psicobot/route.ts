import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authConfig } from "../../../lib/auth";
import prisma from "../../../lib/prisma";
import { decryptNullableSensitiveText, decryptSensitiveText } from "@/lib/encryption";
import { parseJsonBody, requiredTrimmedString } from "@/lib/api-validation";

const RAG_API_URL =
  process.env.PSICOBOT_RAG_API_URL || "http://localhost:8000/api/chat";

const MAX_MESSAGE_LENGTH = 1600;
const MAX_HISTORY_ITEMS = 8;
const MAX_HISTORY_TEXT_LENGTH = 700;
const RAG_TIMEOUT_MS = 20000;
const RAG_RETRY_ATTEMPTS = 2;
const RAG_RETRY_DELAY_MS = 700;

const psicobotHistoryItemSchema = z.object({
  sender: z.enum(["user", "bot"]).optional(),
  text: z.string().max(5000).optional(),
});

const psicobotMessageSchema = z.object({
  message: requiredTrimmedString(
    MAX_MESSAGE_LENGTH,
    "Mensagem inválida ou ausente.",
    `A mensagem deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`,
  ),
  history: z.array(psicobotHistoryItemSchema).max(30).optional(),
});

type UserRole = "ADMIN" | "PSYCHOLOGIST" | "PATIENT" | "UNKNOWN";

type SessionUser = {
  id?: string;
  email?: string | null;
  role?: string;
};

type ChatHistoryItem = {
  sender?: "user" | "bot";
  text?: string;
};

type BotIntent =
  | "ADMIN_USER_SUMMARY"
  | "ADMIN_PENDING_CRP"
  | "ADMIN_RECENT_USERS"
  | "ADMIN_HELP"
  | "PSYCHOLOGIST_LIST_PATIENTS"
  | "PSYCHOLOGIST_PATIENT_SUMMARY"
  | "PSYCHOLOGIST_PATIENT_APPOINTMENTS"
  | "PSYCHOLOGIST_PATIENT_TASKS"
  | "PSYCHOLOGIST_PATIENT_MATERIALS"
  | "PSYCHOLOGIST_PATIENT_CHECKINS"
  | "PSYCHOLOGIST_PATIENT_MESSAGES"
  | "PSYCHOLOGIST_MY_APPOINTMENTS"
  | "PATIENT_MY_SUMMARY"
  | "PATIENT_MY_APPOINTMENTS"
  | "PATIENT_MY_TASKS"
  | "PATIENT_MY_MATERIALS"
  | "PATIENT_MY_PSYCHOLOGISTS"
  | "PATIENT_MY_MESSAGES"
  | "FALLBACK";

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[?!.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isSimpleGreeting(message: string) {
  const text = normalizeText(message);

  return [
    "oi",
    "ola",
    "olá",
    "bom dia",
    "boa tarde",
    "boa noite",
    "e ai",
    "e aí",
    "tudo bem",
    "oi tudo bem",
    "ola tudo bem",
    "olá tudo bem",
  ].includes(text);
}

function buildGreetingReply(role: UserRole) {
  if (role === "ADMIN") {
    return "Oi! Como você está? Posso ajudar com resumo dos usuários, CRPs pendentes, usuários recentes ou orientações sobre a área administrativa do PsicoConnect.";
  }

  if (role === "PSYCHOLOGIST") {
    return "Oi! Como você está? Posso ajudar a consultar pacientes vinculados, próximas consultas, tarefas, materiais, checklists e mensagens. Também posso tirar dúvidas sobre o uso do PsicoConnect.";
  }

  if (role === "PATIENT") {
    return "Oi! Como você está? Posso ajudar com suas consultas, tarefas, materiais, mensagens, psicólogos vinculados e dúvidas sobre o uso do PsicoConnect.";
  }

  return "Oi! Como você está? Posso ajudar com dúvidas sobre o uso do PsicoConnect.";
}

function isGenericPatientTerm(value: string) {
  const term = normalizeText(value);

  return [
    "paciente",
    "pacientes",
    "cliente",
    "clientes",
    "o paciente",
    "a paciente",
    "meu paciente",
    "minha paciente",
    "nome do paciente",
    "nome do seu paciente",
    "nome da paciente",
    "nome da sua paciente",
  ].includes(term);
}

function getRole(value: unknown): UserRole {
  const role = String(value || "UNKNOWN").toUpperCase();

  if (["ADMIN", "PSYCHOLOGIST", "PATIENT"].includes(role)) {
    return role as UserRole;
  }

  return "UNKNOWN";
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "Não informado";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "Não informado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDateOnly(value: Date | string | null | undefined) {
  if (!value) return "Não informado";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "Não informado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

function getDisplayName(patient: {
  socialName?: string | null;
  user?: { name?: string | null } | null;
}) {
  const socialName = decryptNullableSensitiveText(patient.socialName).trim();

  return socialName || patient.user?.name?.trim() || "Paciente";
}

function patientMatchesSearchTerm(
  patient: {
    socialName?: string | null;
    user?: { name?: string | null } | null;
  },
  searchTerm: string,
) {
  const normalizedSearch = normalizeText(searchTerm);

  if (!normalizedSearch) {
    return false;
  }

  const civilName = normalizeText(patient.user?.name || "");
  const socialName = normalizeText(decryptNullableSensitiveText(patient.socialName));

  return civilName.includes(normalizedSearch) || socialName.includes(normalizedSearch);
}

function getPsychologistDisplayName(psychologist: {
  user?: { name?: string | null } | null;
}) {
  return psychologist.user?.name?.trim() || "Psicólogo(a)";
}

function cleanPatientSearchTerm(message: string) {
  const original = message.trim();

  const patterns = [
    /(?:paciente|cliente)\s+(?:chamado\s+|chamada\s+)?(.+)$/i,
    /(?:resuma|resumo|resumir|sintetize|sintese|síntese)\s+(?:o\s+|a\s+)?(?:paciente\s+|cliente\s+)?(.+)$/i,
    /(?:tarefas?|atividades?)\s+(?:do|da|de)\s+(?:paciente\s+|cliente\s+)?(.+)$/i,
    /(?:materiais?|conteudos?|conteúdos?)\s+(?:do|da|de)\s+(?:paciente\s+|cliente\s+)?(.+)$/i,
    /(?:consultas?|agendamentos?|agenda)\s+(?:do|da|de)\s+(?:paciente\s+|cliente\s+)?(.+)$/i,
    /(?:proximas?|próximas?|ultimas?|últimas?|historico|histórico)\s+consultas?\s+(?:do|da|de)\s+(?:paciente\s+|cliente\s+)?(.+)$/i,
    /(?:checklists?|check\s*ins?|pre\s*sessao|pré\s*sessão)\s+(?:do|da|de)\s+(?:paciente\s+|cliente\s+)?(.+)$/i,
    /(?:mensagens?|conversas?|recados?)\s+(?:do|da|de)\s+(?:paciente\s+|cliente\s+)?(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = original.match(pattern);

    if (match?.[1]) {
      const term = match[1]
        .replace(/\b(por favor|pfv|pra mim|para mim|dele|dela)$/i, "")
        .replace(/[?!.,;:]$/g, "")
        .replace(/^\s*(o|a)\s+/i, "")
        .replace(/^\s*(paciente|cliente)\s+/i, "")
        .replace(/\(?\s*nome\s+do\s+seu\s+paciente\s*\)?/gi, "")
        .trim();

      if (!term || isGenericPatientTerm(term)) {
        return "";
      }

      return term;
    }
  }

  return "";
}

function detectIntent(message: string, role: UserRole): BotIntent {
  const text = normalizeText(message);
  const patientSearchTerm = cleanPatientSearchTerm(message);
  const hasPatientTarget = Boolean(patientSearchTerm);

  const isSummary = hasAny(text, [
    "resumo",
    "resuma",
    "resumir",
    "sintese",
    "sintetize",
    "visao geral",
    "visão geral",
    "acompanhamento",
  ]);

  const isAppointment = hasAny(text, [
    "consulta",
    "consultas",
    "agenda",
    "agendamento",
    "proxima consulta",
    "próxima consulta",
    "proximas consultas",
    "próximas consultas",
  ]);

  const isTask = hasAny(text, [
    "tarefa",
    "tarefas",
    "atividade",
    "atividades",
    "pendente",
    "pendentes",
  ]);

  const isMaterial = hasAny(text, [
    "material",
    "materiais",
    "conteudo",
    "conteúdo",
    "psicoeducativo",
    "psicoeducativos",
  ]);

  const isCheckin = hasAny(text, [
    "checklist",
    "checklists",
    "checkin",
    "checkins",
    "pre sessao",
    "pré-sessão",
    "pre-sessao",
    "pré sessão",
    "pre sessao",
    "pré sessao",
    "antes da sessao",
    "antes da sessão",
  ]);

  const isMessage = hasAny(text, [
    "mensagem",
    "mensagens",
    "conversa",
    "conversas",
    "recado",
    "recados",
  ]);

  const isPatientMention = hasAny(text, [
    "paciente",
    "pacientes",
    "cliente",
    "clientes",
  ]);

  if (role === "ADMIN") {
    if (
      hasAny(text, [
        "como funciona a area administrativa",
        "como funciona a área administrativa",
        "como usar a area administrativa",
        "como usar a área administrativa",
        "como funciona o admin",
        "como usar o admin",
        "area administrativa",
        "área administrativa",
        "painel administrativo",
        "painel do admin",
        "administrativo",
        "administrador",
      ])
    ) {
      return "ADMIN_HELP";
    }

    if (
      hasAny(text, [
        "crp pendente",
        "crps pendentes",
        "verificacoes pendentes",
        "verificações pendentes",
        "aguardando aprovacao",
        "aguardando aprovação",
        "solicitacoes de crp",
        "solicitações de crp",
        "psicologos pendentes",
        "psicólogos pendentes",
      ])
    ) {
      return "ADMIN_PENDING_CRP";
    }

    if (
      hasAny(text, [
        "usuarios recentes",
        "usuários recentes",
        "ultimos usuarios",
        "últimos usuários",
        "novos usuarios",
        "novos usuários",
        "listar usuarios",
        "listar usuários",
      ])
    ) {
      return "ADMIN_RECENT_USERS";
    }

    if (
      hasAny(text, [
        "resumo dos usuarios",
        "resumo dos usuários",
        "resumo de usuarios",
        "resumo de usuários",
        "quantos usuarios",
        "quantos usuários",
        "estatisticas dos usuarios",
        "estatísticas dos usuários",
        "dashboard administrativo",
      ])
    ) {
      return "ADMIN_USER_SUMMARY";
    }
  }

  if (role === "PSYCHOLOGIST") {
    if (
      hasAny(text, [
        "listar pacientes",
        "meus pacientes",
        "lista de pacientes",
        "mostrar pacientes",
        "mostre meus pacientes",
      ])
    ) {
      return "PSYCHOLOGIST_LIST_PATIENTS";
    }

    if ((isPatientMention || hasPatientTarget) && isCheckin) {
      return "PSYCHOLOGIST_PATIENT_CHECKINS";
    }

    if ((isPatientMention || hasPatientTarget) && isTask) {
      return "PSYCHOLOGIST_PATIENT_TASKS";
    }

    if ((isPatientMention || hasPatientTarget) && isMaterial) {
      return "PSYCHOLOGIST_PATIENT_MATERIALS";
    }

    if ((isPatientMention || hasPatientTarget) && isMessage) {
      return "PSYCHOLOGIST_PATIENT_MESSAGES";
    }

    if ((isPatientMention || hasPatientTarget) && isAppointment) {
      return "PSYCHOLOGIST_PATIENT_APPOINTMENTS";
    }

    if ((isPatientMention || hasPatientTarget) && isSummary) {
      return "PSYCHOLOGIST_PATIENT_SUMMARY";
    }

    if (isAppointment) {
      return "PSYCHOLOGIST_MY_APPOINTMENTS";
    }
  }

  if (role === "PATIENT") {
    const mentionsPsychologist = hasAny(text, [
      "psicologo",
      "psicólogos",
      "psicologos",
      "psicologa",
      "psicólogas",
      "psicologas",
      "profissional",
      "profissionais",
    ]);

    const mentionsLink = hasAny(text, [
      "vinculado",
      "vinculados",
      "vinculada",
      "vinculadas",
      "ligado",
      "ligados",
      "associado",
      "associados",
      "meus",
      "minhas",
    ]);

    if (
      hasAny(text, [
        "meus psicologos",
        "meus psicólogos",
        "psicologos vinculados",
        "psicólogos vinculados",
        "profissionais vinculados",
        "quais psicologos",
        "quais psicólogos",
        "qual psicologo",
        "qual psicólogo",
      ]) ||
      (mentionsPsychologist && mentionsLink)
    ) {
      return "PATIENT_MY_PSYCHOLOGISTS";
    }

    if (isAppointment) return "PATIENT_MY_APPOINTMENTS";
    if (isTask) return "PATIENT_MY_TASKS";
    if (isMaterial) return "PATIENT_MY_MATERIALS";
    if (isMessage) return "PATIENT_MY_MESSAGES";
    if (isCheckin || isSummary) return "PATIENT_MY_SUMMARY";
  }

  return "FALLBACK";
}

function isPsychologistPatientIntent(intent: BotIntent) {
  return [
    "PSYCHOLOGIST_PATIENT_SUMMARY",
    "PSYCHOLOGIST_PATIENT_APPOINTMENTS",
    "PSYCHOLOGIST_PATIENT_TASKS",
    "PSYCHOLOGIST_PATIENT_MATERIALS",
    "PSYCHOLOGIST_PATIENT_CHECKINS",
    "PSYCHOLOGIST_PATIENT_MESSAGES",
  ].includes(intent);
}

function normalizeChatMessage(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\0/g, "").trim();
}

function normalizeHistory(value: unknown): ChatHistoryItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-MAX_HISTORY_ITEMS)
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const sender = record.sender === "user" ? "user" : "bot";
      const text = normalizeChatMessage(record.text).slice(
        0,
        MAX_HISTORY_TEXT_LENGTH,
      );

      if (!text) return null;

      return { sender, text };
    })
    .filter(Boolean) as ChatHistoryItem[];
}

function canUseMessageAsPatientName(message: string) {
  const text = normalizeText(message);

  if (!text || text.length > 80) return false;

  const words = text.split(" ").filter(Boolean);

  if (words.length > 5) return false;

  const blockedTerms = [
    "como",
    "quando",
    "onde",
    "porque",
    "por que",
    "qual",
    "quais",
    "fale",
    "explique",
    "explica",
    "sobre",
    "ansiedade",
    "depressao",
    "depressão",
    "tdah",
    "autismo",
    "tea",
    "transtorno",
    "sintoma",
    "sintomas",
    "terapia",
    "psicologia",
    "psicologico",
    "psicológico",
    "psicologica",
    "psicológica",
  ];

  if (hasAny(text, blockedTerms)) return false;

  return true;
}

function getPendingPsychologistIntentFromHistory(history: ChatHistoryItem[]) {
  for (let index = history.length - 1; index >= 0; index--) {
    const item = history[index];

    if (!item || item.sender !== "user") continue;

    const previousMessage =
      typeof item.text === "string" ? item.text.trim() : "";

    if (!previousMessage) continue;

    const previousIntent = detectIntent(previousMessage, "PSYCHOLOGIST");

    if (!isPsychologistPatientIntent(previousIntent)) continue;

    const previousSearchTerm = cleanPatientSearchTerm(previousMessage);

    if (!previousSearchTerm) {
      return previousIntent;
    }

    return null;
  }

  return null;
}

function buildMessageFromPendingPsychologistIntent(
  intent: BotIntent,
  patientName: string,
) {
  const name = patientName.trim();

  if (intent === "PSYCHOLOGIST_PATIENT_SUMMARY") {
    return `resuma o paciente ${name}`;
  }

  if (intent === "PSYCHOLOGIST_PATIENT_APPOINTMENTS") {
    return `consultas de ${name}`;
  }

  if (intent === "PSYCHOLOGIST_PATIENT_TASKS") {
    return `tarefas de ${name}`;
  }

  if (intent === "PSYCHOLOGIST_PATIENT_MATERIALS") {
    return `materiais de ${name}`;
  }

  if (intent === "PSYCHOLOGIST_PATIENT_CHECKINS") {
    return `checklists de ${name}`;
  }

  if (intent === "PSYCHOLOGIST_PATIENT_MESSAGES") {
    return `mensagens de ${name}`;
  }

  return name;
}

function compactText(value: string | null | undefined, maxLength = 260) {
  const text = value?.trim();

  if (!text) return "Não informado";

  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength).trim()}...`;
}

async function getCurrentUser() {
  const session = await getServerSession(authConfig);
  const sessionUser = session?.user as SessionUser | undefined;

  if (!sessionUser?.id && !sessionUser?.email) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      OR: [
        ...(sessionUser.id ? [{ id: sessionUser.id }] : []),
        ...(sessionUser.email ? [{ email: sessionUser.email }] : []),
      ],
    },
    include: {
      patient: true,
      psychologist: true,
    },
  });
}

async function buildPatientNameHelp(psychologistId: string) {
  const links = await prisma.psychologistPatient.findMany({
    where: {
      psychologistId,
      active: true,
      status: "APPROVED",
    },
    include: {
      patient: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 12,
  });

  const intro = [
    "Para consultar dados de um paciente, escreva o tipo de informação que deseja e o nome do paciente no final da mensagem.",
    "",
    "Exemplos:",
    "- `resuma o paciente Maria`",
    "- `tarefas de Maria`",
    "- `consultas de Maria`",
    "- `materiais de Maria`",
    "- `mensagens de Maria`",
  ];

  if (links.length === 0) {
    return [
      ...intro,
      "",
      "No momento, não encontrei pacientes vinculados ativos ao seu perfil profissional.",
    ].join("\n");
  }

  const patients = links
    .map((link, index) => `${index + 1}. ${getDisplayName(link.patient)}`)
    .join("\n");

  return [
    ...intro,
    "",
    `Pacientes vinculados ao seu perfil (${links.length}):`,
    patients,
  ].join("\n");
}

async function getLinkedPatientForPsychologist(
  psychologistId: string,
  message: string,
) {
  const searchTerm = cleanPatientSearchTerm(message);

  if (!searchTerm) {
    return {
      error: await buildPatientNameHelp(psychologistId),
      patient: null,
    };
  }

  const allLinks = await prisma.psychologistPatient.findMany({
    where: {
      psychologistId,
      active: true,
      status: "APPROVED",
    },
    include: {
      patient: {
        include: {
          user: {
            select: {
              name: true,
              profileImageUrl: true,
              city: true,
              state: true,
              bio: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const links = allLinks
    .filter((link) => patientMatchesSearchTerm(link.patient, searchTerm))
    .slice(0, 6);

  if (links.length === 0) {
    return {
      error:
        "Não encontrei um paciente com esse nome vinculado ao seu perfil profissional. Confira se o nome foi digitado corretamente ou acesse a tela Pacientes para consultar a lista de vínculos ativos.",
      patient: null,
    };
  }

  if (links.length > 1) {
    const names = links
      .map((link, index) => `${index + 1}. ${getDisplayName(link.patient)}`)
      .join("\n");

    return {
      error: `Encontrei mais de um paciente parecido. Especifique melhor o nome:\n\n${names}`,
      patient: null,
    };
  }

  return {
    error: "",
    patient: links[0].patient,
  };
}

async function listPsychologistPatients(psychologistId: string) {
  const links = await prisma.psychologistPatient.findMany({
    where: {
      psychologistId,
      active: true,
      status: "APPROVED",
    },
    include: {
      patient: {
        include: {
          user: {
            select: {
              name: true,
              city: true,
              state: true,
            },
          },
          appointments: {
            where: {
              psychologistId,
              status: "SCHEDULED",
              dateTime: {
                gte: new Date(),
              },
            },
            orderBy: {
              dateTime: "asc",
            },
            take: 1,
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (links.length === 0) {
    return "Você ainda não possui pacientes vinculados ativos no sistema. Quando um paciente for vinculado ao seu perfil, ele aparecerá na tela Pacientes e também poderá ser consultado por aqui.";
  }

  const items = links
    .map((link, index) => {
      const patient = link.patient;
      const nextAppointment = patient.appointments[0];

      return `${index + 1}. ${getDisplayName(patient)}${
        nextAppointment
          ? ` — próxima consulta em ${formatDateTime(nextAppointment.dateTime)}`
          : " — sem consulta futura registrada"
      }`;
    })
    .join("\n");

  return `**Pacientes vinculados ao seu perfil**\n\nEncontrei ${links.length} paciente(s):\n\n${items}`;
}

async function buildPsychologistPatientSummary(
  psychologistId: string,
  patientId: string,
) {
  const [patient, appointments, notes, checkins, tasks, materials, messages] =
    await Promise.all([
      prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          user: {
            select: {
              name: true,
              city: true,
              state: true,
              bio: true,
            },
          },
        },
      }),
      prisma.appointment.findMany({
        where: {
          patientId,
          psychologistId,
          status: "SCHEDULED",
          dateTime: {
            gte: new Date(),
          },
        },
        orderBy: { dateTime: "asc" },
        take: 8,
      }),
      prisma.sessionNote.findMany({
        where: { patientId, psychologistId, archived: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.preSessionCheckin.findMany({
        where: {
          patientId,
          appointment: { psychologistId },
        },
        include: {
          appointment: {
            select: {
              title: true,
              dateTime: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      prisma.therapeuticTask.findMany({
        where: { patientId, psychologistId },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.patientMaterial.findMany({
        where: { patientId, psychologistId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.patientMessage.findMany({
        where: { patientId, psychologistId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  if (!patient) {
    return "Não encontrei esse paciente vinculado ao seu perfil.";
  }

  const scheduledAppointments = appointments.filter(
    (appointment) => appointment.status === "SCHEDULED",
  );

  const nextAppointment = appointments
    .filter(
      (appointment) =>
        appointment.status === "SCHEDULED" && appointment.dateTime >= new Date(),
    )
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())[0];

  const pendingTasks = tasks.filter((task) => task.status === "PENDING");
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED");

  const recentNotes = notes
    .map(
      (note, index) =>
        `${index + 1}. **${decryptNullableSensitiveText(note.title) || "Anotação"}** (${formatDateOnly(
          note.createdAt,
        )}): ${compactText(decryptSensitiveText(note.content), 220)}`,
    )
    .join("\n");

  const recentCheckins = checkins
    .map((checkin, index) => {
      const levels = [
        checkin.moodLevel !== null ? `humor ${checkin.moodLevel}/10` : "",
        checkin.anxietyLevel !== null
          ? `ansiedade ${checkin.anxietyLevel}/10`
          : "",
        checkin.sleepLevel !== null ? `sono ${checkin.sleepLevel}/10` : "",
      ]
        .filter(Boolean)
        .join(", ");

      return `${index + 1}. ${formatDateOnly(checkin.createdAt)} — ${
        levels || "sem escalas preenchidas"
      }${checkin.mainConcern ? `. Queixa: ${compactText(decryptNullableSensitiveText(checkin.mainConcern), 120)}` : ""}`;
    })
    .join("\n");

  return [
    `**Resumo de ${getDisplayName(patient)}**`,
    "",
    "**Visão geral**",
    `- Consultas futuras agendadas com você: ${appointments.length}`,
    `- Consultas ativas recentes: ${scheduledAppointments.length}`,
    nextAppointment
      ? `- Próxima consulta: ${formatDateTime(nextAppointment.dateTime)}`
      : "- Próxima consulta: não há consulta futura registrada com esse paciente",
    "",
    "**Tarefas, materiais e mensagens**",
    `- Tarefas recentes: ${tasks.length}`,
    `- Pendentes: ${pendingTasks.length}`,
    `- Concluídas: ${completedTasks.length}`,
    `- Materiais enviados recentemente: ${materials.length}`,
    `- Mensagens recentes registradas: ${messages.length}`,
    "",
    "**Checklists pré-sessão**",
    recentCheckins || "Não há checklists pré-sessão recentes registrados.",
    "",
    "**Anotações internas recentes**",
    recentNotes || "Não há anotações internas ativas recentes registradas.",
    "",
    "_Este resumo é apenas um apoio à organização das informações e deve ser revisado pelo psicólogo antes de qualquer uso em prontuário, relatório ou decisão clínica._",
  ].join("\n");
}

async function listPsychologistPatientAppointments(
  psychologistId: string,
  patientId: string,
) {
  const appointments = await prisma.appointment.findMany({
    where: {
      patientId,
      psychologistId,
      status: "SCHEDULED",
      dateTime: {
        gte: new Date(),
      },
    },
    orderBy: { dateTime: "asc" },
    take: 10,
  });

  if (appointments.length === 0) {
    return "Não encontrei consultas futuras agendadas com esse paciente. Consultas canceladas ou que já passaram da data não aparecem nessa listagem.";
  }

  const items = appointments
    .map(
      (appointment) =>
        `- ${decryptNullableSensitiveText(appointment.title) || "Consulta"}: ${formatDateTime(
          appointment.dateTime,
        )} — agendada`,
    )
    .join("\n");

  return `Próximas consultas agendadas desse paciente:\n\n${items}`;
}

async function listPsychologistPatientTasks(
  psychologistId: string,
  patientId: string,
) {
  const tasks = await prisma.therapeuticTask.findMany({
    where: { patientId, psychologistId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (tasks.length === 0) {
    return "Não encontrei tarefas terapêuticas registradas para esse paciente. Você pode criar uma nova tarefa pela tela do paciente, na aba Tarefas.";
  }

  const items = tasks
    .map(
      (task) =>
        `- ${decryptNullableSensitiveText(task.title) || "Tarefa"} — ${
          task.status === "PENDING"
            ? "pendente"
            : task.status === "COMPLETED"
              ? "concluída"
              : "cancelada"
        }${task.dueDate ? `, prazo: ${formatDateOnly(task.dueDate)}` : ""}`,
    )
    .join("\n");

  return `Tarefas terapêuticas desse paciente:\n\n${items}`;
}

async function listPsychologistPatientMaterials(
  psychologistId: string,
  patientId: string,
) {
  const materials = await prisma.patientMaterial.findMany({
    where: { patientId, psychologistId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (materials.length === 0) {
    return "Não encontrei materiais psicoeducativos enviados para esse paciente. Você pode enviar um novo material pela tela do paciente, na aba Materiais.";
  }

  const items = materials
    .map(
      (material) =>
        `- ${decryptNullableSensitiveText(material.title) || "Material"}${
          material.category ? ` (${decryptNullableSensitiveText(material.category)})` : ""
        } — enviado em ${formatDateOnly(material.createdAt)}${
          material.viewedAt ? `, visualizado em ${formatDateOnly(material.viewedAt)}` : ""
        }`,
    )
    .join("\n");

  return `Materiais enviados para esse paciente:\n\n${items}`;
}

async function listPsychologistPatientCheckins(
  psychologistId: string,
  patientId: string,
) {
  const checkins = await prisma.preSessionCheckin.findMany({
    where: {
      patientId,
      appointment: { psychologistId },
    },
    include: {
      appointment: {
        select: {
          title: true,
          dateTime: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  if (checkins.length === 0) {
    return "Não encontrei checklists pré-sessão respondidos por esse paciente. Eles aparecerão aqui quando o paciente responder antes de uma consulta.";
  }

  const items = checkins
    .map((checkin) => {
      const levels = [
        checkin.moodLevel !== null ? `humor ${checkin.moodLevel}/10` : "",
        checkin.anxietyLevel !== null
          ? `ansiedade ${checkin.anxietyLevel}/10`
          : "",
        checkin.sleepLevel !== null ? `sono ${checkin.sleepLevel}/10` : "",
      ]
        .filter(Boolean)
        .join(", ");

      return `- ${formatDateOnly(checkin.createdAt)} (${decryptNullableSensitiveText(checkin.appointment.title) || "consulta"}): ${
        levels || "sem escalas preenchidas"
      }${checkin.topicsToDiscuss ? `. Temas: ${compactText(decryptNullableSensitiveText(checkin.topicsToDiscuss), 150)}` : ""}`;
    })
    .join("\n");

  return `Checklists pré-sessão recentes:\n\n${items}`;
}

async function listPsychologistPatientMessages(
  psychologistId: string,
  patientId: string,
) {
  const messages = await prisma.patientMessage.findMany({
    where: { patientId, psychologistId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  if (messages.length === 0) {
    return "Não encontrei mensagens registradas com esse paciente. Você pode usar a aba Mensagens da tela do paciente para iniciar uma comunicação assíncrona.";
  }

  const items = messages
    .map(
      (message) =>
        `- ${formatDateTime(message.createdAt)} — ${
          message.senderRole === "PSYCHOLOGIST" ? "Psicólogo" : "Paciente"
        }: ${compactText(decryptSensitiveText(message.content), 180)}`,
    )
    .join("\n");

  return `Mensagens recentes com esse paciente:\n\n${items}`;
}

async function listPsychologistAppointments(psychologistId: string) {
  const now = new Date();

  const appointments = await prisma.appointment.findMany({
    where: {
      psychologistId,
      status: "SCHEDULED",
      dateTime: {
        gte: now,
      },
    },
    include: {
      patient: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      dateTime: "asc",
    },
    take: 12,
  });

  if (appointments.length === 0) {
    return "Você não possui consultas futuras agendadas no momento. Consultas canceladas ou que já passaram da data não aparecem nessa resposta.";
  }

  const items = appointments
    .map((appointment) => {
      const patientName = getDisplayName(appointment.patient);

      return `- ${formatDateTime(appointment.dateTime)} — ${patientName}${
        appointment.title
          ? ` (${decryptNullableSensitiveText(appointment.title)})`
          : ""
      }${
        appointment.location
          ? ` — ${decryptNullableSensitiveText(appointment.location)}`
          : ""
      }`;
    })
    .join("\n");

  return `Suas próximas consultas agendadas:\n\n${items}`;
}

async function buildAdminUserSummary() {
  const [totalUsers, admins, psychologists, patients, pendingCrp, approvedCrp, rejectedCrp] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "PSYCHOLOGIST" } }),
      prisma.user.count({ where: { role: "PATIENT" } }),
      prisma.psychologist.count({
        where: { crpVerificationStatus: "PENDING" },
      }),
      prisma.psychologist.count({
        where: { crpVerificationStatus: "APPROVED" },
      }),
      prisma.psychologist.count({
        where: { crpVerificationStatus: "REJECTED" },
      }),
    ]);

  return [
    "**Resumo administrativo do PsicoConnect**",
    "",
    "**Usuários cadastrados**",
    `- Total de usuários: ${totalUsers}`,
    `- Administradores: ${admins}`,
    `- Psicólogos: ${psychologists}`,
    `- Pacientes: ${patients}`,
    "",
    "**Verificação de CRP**",
    `- Pendentes: ${pendingCrp}`,
    `- Aprovados: ${approvedCrp}`,
    `- Rejeitados: ${rejectedCrp}`,
    "",
    "_Esses dados são apenas uma visão administrativa de leitura. Para aprovar, rejeitar ou editar usuários, use a área administrativa do sistema._",
  ].join("\n");
}

async function listAdminPendingCrpRequests() {
  const psychologists = await prisma.psychologist.findMany({
    where: {
      crpVerificationStatus: "PENDING",
    },
    include: {
      user: {
        select: {
          name: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      user: {
        createdAt: "asc",
      },
    },
    take: 12,
  });

  if (psychologists.length === 0) {
    return "Não há solicitações de CRP pendentes no momento. Quando um psicólogo se cadastrar ou reenviar os dados profissionais, a solicitação aparecerá na área administrativa.";
  }

  const items = psychologists
    .map((psychologist, index) => {
      const crpParts = [
        psychologist.crpState,
        psychologist.crpRegion,
        psychologist.crpNumber,
      ].filter(Boolean);

      return `${index + 1}. ${psychologist.user.name} — CRP ${psychologist.crp || crpParts.join("/") || "não informado"} — cadastro em ${formatDateOnly(psychologist.user.createdAt)}`;
    })
    .join("\n");

  return [
    "**Solicitações de CRP pendentes**",
    "",
    items,
    "",
    "Para aprovar ou rejeitar uma solicitação, acesse a área administrativa e revise os dados do psicólogo.",
  ].join("\n");
}

async function listAdminRecentUsers() {
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      name: true,
      role: true,
      createdAt: true,
      psychologist: {
        select: {
          crpVerificationStatus: true,
          crp: true,
        },
      },
    },
    take: 12,
  });

  if (users.length === 0) {
    return "Ainda não há usuários cadastrados no sistema. Quando novos cadastros forem realizados, eles aparecerão nesta visão administrativa.";
  }

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrador",
    PSYCHOLOGIST: "Psicólogo",
    PATIENT: "Paciente",
  };

  const statusLabels: Record<string, string> = {
    PENDING: "CRP pendente",
    APPROVED: "CRP aprovado",
    REJECTED: "CRP rejeitado",
  };

  const items = users
    .map((user, index) => {
      const roleLabel = roleLabels[user.role] || user.role;
      const crpStatus = user.psychologist?.crpVerificationStatus
        ? ` — ${statusLabels[user.psychologist.crpVerificationStatus] || user.psychologist.crpVerificationStatus}`
        : "";

      return `${index + 1}. ${user.name} — ${roleLabel}${crpStatus} — cadastrado em ${formatDateOnly(user.createdAt)}`;
    })
    .join("\n");

  return `**Usuários recentes**\n\n${items}`;
}

function buildAdminHelp() {
  return [
    "**Área administrativa do PsicoConnect**",
    "",
    "A área administrativa é usada para acompanhar usuários e solicitações de verificação profissional.",
    "",
    "Com uma conta de administrador, você pode:",
    "- visualizar um resumo dos usuários cadastrados;",
    "- consultar psicólogos com CRP pendente;",
    "- acompanhar usuários recentes;",
    "- aprovar ou rejeitar verificações de CRP quando os dados forem revisados;",
    "- informar o motivo quando uma solicitação de CRP for rejeitada.",
    "",
    "Exemplos de perguntas que você pode fazer aqui:",
    "- resumo dos usuários",
    "- CRPs pendentes",
    "- usuários recentes",
    "",
    "Essas funções são restritas a contas com perfil de administrador.",
  ].join("\n");
}

async function handleAdminIntent(intent: BotIntent) {
  if (intent === "ADMIN_HELP") {
    return buildAdminHelp();
  }

  if (intent === "ADMIN_PENDING_CRP") {
    return await listAdminPendingCrpRequests();
  }

  if (intent === "ADMIN_RECENT_USERS") {
    return await listAdminRecentUsers();
  }

  return await buildAdminUserSummary();
}

async function handlePsychologistIntent(
  intent: BotIntent,
  psychologistId: string,
  message: string,
) {
  if (intent === "PSYCHOLOGIST_LIST_PATIENTS") {
    return await listPsychologistPatients(psychologistId);
  }

  if (intent === "PSYCHOLOGIST_MY_APPOINTMENTS") {
    return await listPsychologistAppointments(psychologistId);
  }

  const { patient, error } = await getLinkedPatientForPsychologist(
    psychologistId,
    message,
  );

  if (!patient) return error;

  if (intent === "PSYCHOLOGIST_PATIENT_APPOINTMENTS") {
    return await listPsychologistPatientAppointments(psychologistId, patient.id);
  }

  if (intent === "PSYCHOLOGIST_PATIENT_TASKS") {
    return await listPsychologistPatientTasks(psychologistId, patient.id);
  }

  if (intent === "PSYCHOLOGIST_PATIENT_MATERIALS") {
    return await listPsychologistPatientMaterials(psychologistId, patient.id);
  }

  if (intent === "PSYCHOLOGIST_PATIENT_CHECKINS") {
    return await listPsychologistPatientCheckins(psychologistId, patient.id);
  }

  if (intent === "PSYCHOLOGIST_PATIENT_MESSAGES") {
    return await listPsychologistPatientMessages(psychologistId, patient.id);
  }

  return await buildPsychologistPatientSummary(psychologistId, patient.id);
}

async function buildPatientSummary(patientId: string) {
  const [appointments, tasks, materials, messages, links] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        patientId,
        status: "SCHEDULED",
        dateTime: {
          gte: new Date(),
        },
      },
      orderBy: { dateTime: "asc" },
      take: 8,
    }),
    prisma.therapeuticTask.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.patientMaterial.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.patientMessage.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.psychologistPatient.findMany({
      where: { patientId, active: true, status: "APPROVED" },
      include: {
        psychologist: {
          include: {
            user: {
              select: { name: true },
            },
          },
        },
      },
    }),
  ]);

  const nextAppointment = appointments
    .filter(
      (appointment) =>
        appointment.status === "SCHEDULED" && appointment.dateTime >= new Date(),
    )
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())[0];

  const pendingTasks = tasks.filter((task) => task.status === "PENDING");
  const unreadMaterials = materials.filter((material) => !material.viewedAt);

  return [
    "**Resumo do seu acompanhamento no PsicoConnect**",
    "",
    "**Visão geral**",
    `- Psicólogos vinculados: ${links.length}`,
    nextAppointment
      ? `- Próxima consulta: ${formatDateTime(nextAppointment.dateTime)}`
      : "- Próxima consulta: você não possui consulta futura registrada no momento",
    "",
    "**Atividades recentes**",
    `- Tarefas recentes: ${tasks.length}`,
    `- Tarefas pendentes: ${pendingTasks.length}`,
    `- Materiais recebidos recentemente: ${materials.length}`,
    `- Materiais ainda não visualizados: ${unreadMaterials.length}`,
    `- Mensagens recentes registradas: ${messages.length}`,
    "",
    "_Essas informações são apenas um resumo do que está registrado no sistema. Em caso de dúvida clínica, converse diretamente com seu psicólogo._",
  ].join("\n");
}

async function listPatientAppointments(patientId: string) {
  const appointments = await prisma.appointment.findMany({
    where: {
      patientId,
      status: "SCHEDULED",
      dateTime: {
        gte: new Date(),
      },
    },
    include: {
      psychologist: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { dateTime: "asc" },
    take: 10,
  });

  if (appointments.length === 0) {
    return "Você não possui consultas futuras agendadas no momento. Consultas canceladas ou que já passaram da data não aparecem nessa resposta.";
  }

  const items = appointments
    .map(
      (appointment) =>
        `- ${decryptNullableSensitiveText(appointment.title) || "Consulta"}: ${formatDateTime(
          appointment.dateTime,
        )} com ${getPsychologistDisplayName(appointment.psychologist)} — agendada`,
    )
    .join("\n");

  return `Suas próximas consultas agendadas:\n\n${items}`;
}

async function listPatientTasks(patientId: string) {
  const tasks = await prisma.therapeuticTask.findMany({
    where: { patientId },
    include: {
      psychologist: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (tasks.length === 0) {
    return "Você ainda não possui tarefas terapêuticas registradas no momento. Quando seu psicólogo enviar uma tarefa, ela aparecerá aqui e também na tela Tarefas e materiais.";
  }

  const items = tasks
    .map(
      (task) =>
        `- ${decryptNullableSensitiveText(task.title) || "Tarefa"} — ${
          task.status === "PENDING"
            ? "pendente"
            : task.status === "COMPLETED"
              ? "concluída"
              : "cancelada"
        }${task.dueDate ? `, prazo: ${formatDateOnly(task.dueDate)}` : ""} — ${getPsychologistDisplayName(task.psychologist)}`,
    )
    .join("\n");

  return `Suas tarefas terapêuticas:\n\n${items}`;
}

async function listPatientMaterials(patientId: string) {
  const materials = await prisma.patientMaterial.findMany({
    where: { patientId },
    include: {
      psychologist: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (materials.length === 0) {
    return "Você ainda não recebeu materiais psicoeducativos pelo sistema. Quando seu psicólogo enviar um material, ele aparecerá aqui e na tela Tarefas e materiais.";
  }

  const items = materials
    .map(
      (material) =>
        `- ${decryptNullableSensitiveText(material.title) || "Material"}${
          material.category ? ` (${decryptNullableSensitiveText(material.category)})` : ""
        } — enviado por ${getPsychologistDisplayName(material.psychologist)} em ${formatDateOnly(material.createdAt)}${
          material.viewedAt ? `, visualizado em ${formatDateOnly(material.viewedAt)}` : ""
        }`,
    )
    .join("\n");

  return `Materiais que você recebeu:\n\n${items}`;
}

async function listPatientPsychologists(patientId: string) {
  const links = await prisma.psychologistPatient.findMany({
    where: { patientId, active: true, status: "APPROVED" },
    include: {
      psychologist: {
        include: {
          user: {
            select: {
              name: true,
              city: true,
              state: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (links.length === 0) {
    return "Você ainda não possui psicólogos vinculados no sistema. Se isso estiver incorreto, fale com a clínica, administrador ou profissional responsável para confirmar o vínculo do seu cadastro.";
  }

  const items = links
    .map((link) => {
      const psychologist = link.psychologist;

      return `- ${getPsychologistDisplayName(psychologist)}${
        psychologist.professionalTitle ? ` — ${psychologist.professionalTitle}` : ""
      }${psychologist.crp ? ` — CRP ${psychologist.crp}` : ""}`;
    })
    .join("\n");

  return `Psicólogos vinculados ao seu perfil:\n\n${items}`;
}

async function listPatientMessages(patientId: string) {
  const messages = await prisma.patientMessage.findMany({
    where: { patientId },
    include: {
      psychologist: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  if (messages.length === 0) {
    return "Você ainda não possui mensagens registradas no sistema. Quando houver uma mensagem sua ou do psicólogo, ela aparecerá aqui e na tela Mensagens.";
  }

  const items = messages
    .map(
      (message) =>
        `- ${formatDateTime(message.createdAt)} — ${
          message.senderRole === "PSYCHOLOGIST"
            ? getPsychologistDisplayName(message.psychologist)
            : "Você"
        }: ${compactText(decryptSensitiveText(message.content), 180)}`,
    )
    .join("\n");

  return `Suas mensagens recentes:\n\n${items}`;
}

async function handlePatientIntent(intent: BotIntent, patientId: string) {
  if (intent === "PATIENT_MY_APPOINTMENTS") {
    return await listPatientAppointments(patientId);
  }

  if (intent === "PATIENT_MY_TASKS") {
    return await listPatientTasks(patientId);
  }

  if (intent === "PATIENT_MY_MATERIALS") {
    return await listPatientMaterials(patientId);
  }

  if (intent === "PATIENT_MY_PSYCHOLOGISTS") {
    return await listPatientPsychologists(patientId);
  }

  if (intent === "PATIENT_MY_MESSAGES") {
    return await listPatientMessages(patientId);
  }

  return await buildPatientSummary(patientId);
}

async function requestRagReply(message: string, role: UserRole) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RAG_TIMEOUT_MS);

  try {
    const response = await fetch(RAG_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        role,
        safetyContext:
          "Responder apenas como apoio informativo e psicoeducacional. Não diagnosticar, não indicar tratamento individualizado e orientar busca de profissional qualificado em dúvidas clínicas ou situações de risco.",
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Falha no backend RAG:", response.status, data);
      throw new Error("Falha no backend de IA.");
    }

    const reply = data?.reply || data?.answer;

    if (typeof reply !== "string" || !reply.trim()) {
      throw new Error("Backend RAG retornou uma resposta vazia.");
    }

    return reply;
  } finally {
    clearTimeout(timeout);
  }
}

async function forwardToRag(message: string, role: UserRole) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= RAG_RETRY_ATTEMPTS; attempt++) {
    try {
      return await requestRagReply(message, role);
    } catch (error) {
      lastError = error;
      console.error(
        `Erro ao encaminhar mensagem para o backend RAG. Tentativa ${attempt}/${RAG_RETRY_ATTEMPTS}:`,
        error,
      );

      if (attempt < RAG_RETRY_ATTEMPTS) {
        await wait(RAG_RETRY_DELAY_MS);
      }
    }
  }

  console.error("Todas as tentativas de contato com o backend RAG falharam:", lastError);

  return [
    "Não consegui responder com a IA externa agora.",
    "",
    "Para perguntas sobre dados do sistema, continuo usando as informações internas do PsicoConnect. Para perguntas informativas, tente novamente em alguns instantes.",
    "",
    "O PsicoBot é apenas um apoio informativo e não substitui avaliação profissional.",
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const parsedBody = await parseJsonBody(req, psicobotMessageSchema);

    if (parsedBody.error) {
      return parsedBody.error;
    }

    const body = parsedBody.data;
    const message = normalizeChatMessage(body.message);
    const history = normalizeHistory(body.history);

    if (!message) {
      return NextResponse.json(
        { error: "Mensagem inválida ou ausente." },
        { status: 400 },
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `A mensagem deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.` },
        { status: 400 },
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 },
      );
    }

    const role = getRole(user.role);

    if (role === "UNKNOWN") {
      return NextResponse.json(
        { error: "Perfil de usuário inválido para uso do PsicoBot." },
        { status: 403 },
      );
    }

    if (isSimpleGreeting(message)) {
      return NextResponse.json({ reply: buildGreetingReply(role) });
    }

    let effectiveMessage = message;
    let intent = detectIntent(message, role);

    if (
      role === "PSYCHOLOGIST" &&
      intent === "FALLBACK" &&
      canUseMessageAsPatientName(message)
    ) {
      const pendingIntent = getPendingPsychologistIntentFromHistory(history);

      if (pendingIntent) {
        intent = pendingIntent;
        effectiveMessage = buildMessageFromPendingPsychologistIntent(
          pendingIntent,
          message,
        );
      }
    }

    if (role === "ADMIN" && intent !== "FALLBACK") {
      const reply = await handleAdminIntent(intent);

      return NextResponse.json({ reply });
    }

    if (role === "PSYCHOLOGIST" && intent !== "FALLBACK") {
      if (!user.psychologist) {
        return NextResponse.json({
          reply:
            "Não encontrei um perfil de psicólogo vinculado à sua conta. Verifique seu cadastro.",
        });
      }

      const reply = await handlePsychologistIntent(
        intent,
        user.psychologist.id,
        effectiveMessage,
      );

      return NextResponse.json({ reply });
    }

    if (role === "PATIENT" && intent !== "FALLBACK") {
      if (!user.patient) {
        return NextResponse.json({
          reply:
            "Não encontrei um perfil de paciente vinculado à sua conta. Verifique seu cadastro.",
        });
      }

      const reply = await handlePatientIntent(intent, user.patient.id);

      return NextResponse.json({ reply });
    }

    const reply = await forwardToRag(message, role);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Erro na rota /api/psicobot:", error);

    return NextResponse.json(
      { error: "Erro interno ao processar a mensagem." },
      { status: 500 },
    );
  }
}
