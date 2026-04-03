export interface AIPayload {
  pageName: string;
  contextData: string;
  defaultQuestion?: string;
}

const bus = new EventTarget();

export function openAIAssistant(payload: AIPayload) {
  bus.dispatchEvent(new CustomEvent('open', { detail: payload }));
}

export function onOpenAIAssistant(callback: (payload: AIPayload) => void) {
  const handler = (e: Event) => callback((e as CustomEvent<AIPayload>).detail);
  bus.addEventListener('open', handler);
  return () => bus.removeEventListener('open', handler);
}
