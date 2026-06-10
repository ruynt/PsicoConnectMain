import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

const MAX_PROMPT_LENGTH = 2000;
const MAX_HISTORY_ITEMS = 10;
const MAX_HISTORY_TEXT_LENGTH = 1200;
const MAX_SOURCES = 5;
const MAX_SOURCE_TITLE_LENGTH = 160;
const MAX_SOURCE_URI_LENGTH = 700;
const ALLOWED_ROLES = ["ADMIN", "PSYCHOLOGIST", "PATIENT"] as const;

type ChatHistoryItem = {
  role: string;
  text: string;
};

type GeminiContent = {
  role: string;
  parts: { text: string }[];
};

type GeminiSource = {
  uri: string;
  title: string;
};

type GeminiGroundingAttribution = {
  web?: {
    uri?: string;
    title?: string;
  };
};

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
    groundingMetadata?: {
      groundingAttributions?: GeminiGroundingAttribution[];
    };
  }[];
};

function normalizePrompt(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\0/g, "").trim();
}

function isAllowedRole(value: unknown) {
  return ALLOWED_ROLES.includes(String(value) as (typeof ALLOWED_ROLES)[number]);
}

function normalizeSourceUri(value: string) {
  if (!value || value.length > MAX_SOURCE_URI_LENGTH) {
    return "";
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function normalizeHistory(value: unknown): ChatHistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(-MAX_HISTORY_ITEMS)
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const role = record.role === "model" ? "model" : "user";
      const text = normalizePrompt(record.text).slice(0, MAX_HISTORY_TEXT_LENGTH);

      if (!text) {
        return null;
      }

      return {
        role,
        text,
      };
    })
    .filter(Boolean) as ChatHistoryItem[];
}

function formatHistory(history: ChatHistoryItem[]): GeminiContent[] {
  return history.map((message) => ({
    role: message.role,
    parts: [{ text: message.text }],
  }));
}

function getSources(result: GeminiResponse): GeminiSource[] {
  const groundingAttributions =
    result.candidates?.[0]?.groundingMetadata?.groundingAttributions || [];

  const seenUris = new Set<string>();

  return groundingAttributions
    .map((attribution) => {
      const uri = normalizeSourceUri(attribution.web?.uri || "");
      const title = (attribution.web?.title || "")
        .trim()
        .slice(0, MAX_SOURCE_TITLE_LENGTH);

      return { uri, title };
    })
    .filter((source) => {
      if (!source.uri || !source.title || seenUris.has(source.uri)) {
        return false;
      }

      seenUris.add(source.uri);
      return true;
    })
    .slice(0, MAX_SOURCES);
}

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.id || !isAllowedRole(token.role)) {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 403 },
    );
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Serviço de IA não configurado no servidor." },
      { status: 500 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const prompt = normalizePrompt(body?.prompt);
    const history = normalizeHistory(body?.history);

    if (!prompt) {
      return NextResponse.json(
        { error: "Mensagem inválida ou ausente." },
        { status: 400 },
      );
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `A mensagem deve ter no máximo ${MAX_PROMPT_LENGTH} caracteres.` },
        { status: 400 },
      );
    }

    const contents = formatHistory(history);
    contents.push({ role: "user", parts: [{ text: prompt }] });

    const systemInstruction = [
      "Você é o PsicoConnect AI, um assistente de apoio informativo e psicoeducacional.",
      "Responda em português do Brasil, com tom acolhedor, objetivo e profissional.",
      "Não realize diagnóstico, não indique tratamento individualizado, não substitua psicólogo, médico ou serviço de emergência.",
      "Quando a pergunta envolver diagnóstico, medicação, risco, crise, urgência ou decisão clínica, oriente o usuário a procurar um profissional qualificado ou serviço de emergência local.",
      "Não solicite dados pessoais sensíveis desnecessários e não afirme ter acesso a informações clínicas fora do que o usuário escreveu na conversa.",
      "Use a busca apenas para apoio informativo e cite fontes quando elas forem retornadas.",
    ].join(" ");

    const payload = {
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      tools: [{ google_search: {} }],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    };

    const apiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("Erro da API Gemini:", apiResponse.status, errorText);

      return NextResponse.json(
        { error: "Falha ao obter resposta da IA." },
        { status: 502 },
      );
    }

    const result = (await apiResponse.json()) as GeminiResponse;
    const responseText =
      result.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Desculpe, não consegui gerar uma resposta significativa.";

    const sources = getSources(result);

    let finalResponse = responseText;

    if (sources.length > 0) {
      finalResponse += "\n\n**Fontes de Pesquisa:**\n";
      sources.forEach((source) => {
        finalResponse += `* [${source.title}](${source.uri})\n`;
      });
    }

    return NextResponse.json({ response: finalResponse, sources });
  } catch (error: unknown) {
    console.error("Erro no servidor de chat:", error);

    return NextResponse.json(
      { error: "Erro interno do servidor ao processar o chat." },
      { status: 500 },
    );
  }
}
