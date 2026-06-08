import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

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

export async function POST(req: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Chave GEMINI_API_KEY não configurada no servidor." },
      { status: 500 },
    );
  }

  try {
    const { prompt, history } = (await req.json()) as {
      prompt: string;
      history: ChatHistoryItem[];
    };

    const contents = formatHistory(history || []);
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
