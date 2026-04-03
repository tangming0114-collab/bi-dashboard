export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const LLM_CONFIG_KEY = 'kol_bi_llm_config';

export const PRESETS = {
  kimiCode: {
    name: 'Kimi Code',
    baseUrl: 'https://api.kimi.com/coding/v1',
    model: 'kimi-for-coding',
  },
  kimi: {
    name: 'Kimi (Moonshot)',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
};

export function getLLMConfig(): LLMConfig {
  // 优先 localStorage，其次 env
  const saved = localStorage.getItem(LLM_CONFIG_KEY);
  if (saved) {
    try {
      return { ...JSON.parse(saved), temperature: 0.7 };
    } catch {
      // ignore
    }
  }

  return {
    baseUrl: import.meta.env.VITE_LLM_BASE_URL || PRESETS.kimi.baseUrl,
    apiKey: import.meta.env.VITE_LLM_API_KEY || '',
    model: import.meta.env.VITE_LLM_MODEL || PRESETS.kimi.model,
    temperature: 0.7,
  };
}

export function saveLLMConfig(config: LLMConfig): void {
  localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(config));
}

export function hasLLMConfig(): boolean {
  const c = getLLMConfig();
  return !!c.apiKey && !!c.baseUrl && !!c.model;
}

export async function callLLM(
  messages: LLMMessage[],
  onChunk: (chunk: string, done: boolean) => void,
  signal?: AbortSignal
): Promise<void> {
  const config = getLLMConfig();
  if (!config.apiKey) {
    throw new Error('请先配置大模型 API Key');
  }

  let baseUrl = config.baseUrl.replace(/\/$/, '');
  // 开发环境下，为 Kimi Code API 自动走 Vite 代理，避免浏览器 CORS
  if (import.meta.env.DEV && baseUrl === 'https://api.kimi.com/coding/v1') {
    baseUrl = '/__proxy_kimi';
  }

  const url = `${baseUrl}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    let msg = `请求失败: ${res.status}`;
    try {
      const err = await res.json();
      msg = err?.error?.message || err?.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  if (!res.body) {
    throw new Error('响应体为空');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) {
              onChunk(delta, false);
            }
          } catch {
            // ignore malformed sse
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  onChunk('', true);
}

export async function testLLMConnection(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      reject(new Error('连接超时'));
    }, 15000);

    callLLM(
      [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "OK" only.' },
      ],
      (_chunk, done) => {
        if (done) {
          clearTimeout(timeout);
          resolve(true);
        }
      },
      controller.signal
    ).catch((err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
