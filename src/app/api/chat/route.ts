import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

const MAX_PROMPT_LENGTH = 2000;
const MAX_HISTORY_ITEMS = 12;
const MAX_HISTORY_TEXT_LENGTH = 1500;

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

  return value.trim();
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

  return groundingAttributions
    .map((attribution) => ({
      uri: attribution.web?.uri || "",
      title: attribution.web?.title || "",
    }))
    .filter((source) => Boolean(source.uri && source.title));
}

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.id) {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 403 },
    );
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Chave GEMINI_API_KEY não configurada no servidor." },
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

    const systemInstruction =
      "Você é o PsicoConnect AI, um assistente empático especializado em fornecer informações gerais sobre saúde mental, terapias e bem-estar, baseado em fontes confiáveis. Mantenha um tom acolhedor e profissional. Se a pergunta for médica ou de diagnóstico, direcione o usuário a procurar um profissional de saúde qualificado. Use a ferramenta de busca para respostas atuais e fundamentadas.";

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
        { status: apiResponse.status },
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
