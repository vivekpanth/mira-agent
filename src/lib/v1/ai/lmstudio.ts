import { lmstudio } from "./config";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type StructuredRequest = {
  messages: ChatMessage[];
  schema: Record<string, unknown>;
  schemaName: string;
};

function ollamaRootUrl(): string {
  return lmstudio.baseUrl.replace(/\/v1\/?$/, "");
}

function parseStructuredJson<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

async function ollamaStructured<T>({ messages, schema }: StructuredRequest): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), lmstudio.timeoutMs);

  try {
    const res = await fetch(`${ollamaRootUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: lmstudio.model,
        messages,
        format: schema,
        stream: false,
        options: {
          temperature: lmstudio.temperature,
          num_predict: lmstudio.maxTokens,
        },
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { message?: { content?: string } };
    const content = data.message?.content?.trim();
    if (!content) return null;

    return parseStructuredJson<T>(content);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function lmstudioOpenAIStructured<T>({ messages, schema, schemaName }: StructuredRequest): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), lmstudio.timeoutMs);

  try {
    const res = await fetch(`${lmstudio.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: lmstudio.model,
        messages,
        temperature: lmstudio.temperature,
        max_tokens: lmstudio.maxTokens,
        stream: false,
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, schema },
        },
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    return parseStructuredJson<T>(content);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function lmstudioStructured<T>(request: StructuredRequest): Promise<T | null> {
  if (!lmstudio.enabled) return null;

  const useOllama = lmstudio.provider === "ollama" || lmstudio.baseUrl.includes(":11434");
  if (useOllama) return ollamaStructured<T>(request);
  return lmstudioOpenAIStructured<T>(request);
}

export async function lmstudioAvailable(): Promise<boolean> {
  if (!lmstudio.enabled) return false;
  try {
    const res = await fetch(`${lmstudio.baseUrl}/models`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
