import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";
import { getErrorMessage, getExternalApiErrorMessage } from "@/lib/errorUtils";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

const MAX_NOTE_CONTENT_LENGTH = 2500;
const MAX_NOTES_TEXT_LENGTH = 45000;
const MAX_SUMMARY_OUTPUT_TOKENS = 1600;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function limitText(value: string | null | undefined, maxLength: number) {
  const text = value?.trim() || "";

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}... [texto reduzido por limite de segurança]`;
}

async function getAuthorizedPsychologist(req: NextRequest, patientId: string) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 403 },
      ),
    };
  }

  const psychologist = await prisma.psychologist.findUnique({
    where: {
      userId: String(token.id),
    },
    select: {
      id: true,
    },
  });

  if (!psychologist) {
    return {
      error: NextResponse.json(
        { error: "Psicólogo não encontrado." },
        { status: 404 },
      ),
    };
  }

  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      psychologistLinks: {
        some: {
          psychologistId: psychologist.id,
          active: true,
        },
      },
    },
    select: {
      id: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!patient) {
    return {
      error: NextResponse.json(
        { error: "Paciente não vinculado a este psicólogo." },
        { status: 403 },
      ),
    };
  }

  return {
    psychologist,
    patient,
  };
}

export async function POST(req: NextRequest, context: Params) {
  try {
    const { id: patientId } = await context.params;

    const auth = await getAuthorizedPsychologist(req, patientId);

    if (auth.error) {
      return auth.error;
    }

    const notes = await prisma.sessionNote.findMany({
      where: {
        patientId: auth.patient.id,
        psychologistId: auth.psychologist.id,
        archived: false,
      },
      select: {
        title: true,
        content: true,
        createdAt: true,
        appointment: {
          select: {
            title: true,
            dateTime: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 30,
    });

    if (notes.length === 0) {
      return NextResponse.json(
        {
          error:
            "Não há anotações ativas suficientes para gerar um resumo de prontuário.",
        },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Serviço de IA não configurado no servidor.",
        },
        { status: 500 },
      );
    }

    const notesText = notes
      .map((note, index) => {
        const appointmentInfo = note.appointment
          ? `Consulta relacionada: ${
              note.appointment.title || "Consulta"
            } em ${formatDate(note.appointment.dateTime)}`
          : "Consulta relacionada: não vinculada";

        return `
ANOTAÇÃO ${index + 1}
Data de criação: ${formatDate(note.createdAt)}
Título: ${note.title || "Sem título"}
${appointmentInfo}
Conteúdo:
${limitText(note.content, MAX_NOTE_CONTENT_LENGTH)}
        `.trim();
      })
      .join("\n\n---\n\n")
      .slice(0, MAX_NOTES_TEXT_LENGTH);

    const prompt = `
Você é um assistente de apoio à organização de anotações clínicas em Psicologia.

Tarefa:
Organize as anotações internas abaixo em um RESUMO PARA PRONTUÁRIO, com linguagem técnica, objetiva, ética e cuidadosa.

Regras obrigatórias:
- Não invente informações que não estejam nas anotações.
- Não atribua diagnóstico, hipótese diagnóstica ou interpretação clínica que não esteja explicitamente registrada.
- Não indique tratamento individualizado que não esteja explicitamente registrado nas anotações.
- Não use linguagem alarmista, moralizante ou julgadora.
- Use frases como "foi registrado", "observa-se nas anotações", "consta nas anotações" quando houver incerteza.
- Não escreva como se o texto já fosse definitivo.
- O texto deve ser revisado pelo psicólogo antes de entrar no prontuário.
- Preserve sigilo e evite detalhes desnecessariamente identificáveis.
- Se as anotações forem insuficientes, informe isso no próprio resumo.

Paciente:
${auth.patient.user.name}

Estrutura desejada:
1. Período e fonte das informações
2. Principais temas registrados
3. Aspectos emocionais e comportamentais mencionados
4. Intervenções, orientações ou condutas registradas
5. Tarefas, encaminhamentos ou combinados terapêuticos
6. Pontos que requerem acompanhamento
7. Observação final de revisão profissional

Anotações:
${notesText}
    `.trim();

    const openAiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.2,
          max_tokens: MAX_SUMMARY_OUTPUT_TOKENS,
          messages: [
            {
              role: "system",
              content:
                "Você organiza informações clínicas em formato técnico, objetivo e cuidadoso. Você não substitui o julgamento profissional do psicólogo, não cria diagnósticos e não inventa dados ausentes.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      },
    );

    const openAiData = await openAiResponse.json();

    if (!openAiResponse.ok) {
      console.error("Erro OpenAI:", openAiData);

      return NextResponse.json(
        {
          error: getExternalApiErrorMessage(
            openAiData,
            "Erro ao gerar resumo com inteligência artificial.",
          ),
        },
        { status: 500 },
      );
    }

    const summary =
      openAiData?.choices?.[0]?.message?.content?.trim() ||
      "Não foi possível gerar o resumo.";

    return NextResponse.json({
      summary,
      sourceNotesCount: notes.length,
      generatedAt: new Date().toISOString(),
      patient: {
        id: auth.patient.id,
        name: auth.patient.user.name,
        email: auth.patient.user.email,
      },
      warning:
        "Este texto foi gerado com apoio de IA e deve ser revisado pelo psicólogo antes de ser registrado no prontuário.",
    });
  } catch (error: unknown) {
    console.error("Erro ao gerar resumo para prontuário:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro interno ao gerar resumo para prontuário.",
        ),
      },
      { status: 500 },
    );
  }
}
