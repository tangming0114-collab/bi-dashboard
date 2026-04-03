import { useEffect, useRef, useState } from 'react';
import { Bot, X, Send, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { callLLM, hasLLMConfig, type LLMMessage } from '@/utils/llm';
import { onOpenAIAssistant, type AIPayload } from '@/utils/aiAssistantBus';
import { buildFullSystemPrompt } from '@/utils/aiContext';
import { queryData } from '@/utils/aiDataQuery';

interface AIAssistantProps {
  rawData: any[];
  onOpenConfig: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AIAssistant({ rawData, onOpenConfig }: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '你好！我是你的 AI 数据助手，已经学习了众引传播集团的媒介业务知识和看板数据字段。\n\n你可以直接问我数据问题，例如：\n• 哪个组返点率最高？\n• 走单业务占比多少？\n• Top10 客户有哪些？\n• 报备和非报备各占多少？\n• 给我一些客户维护建议。',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState<AIPayload | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open]);

  // 监听外部打开事件
  useEffect(() => {
    return onOpenAIAssistant((payload) => {
      setContext(payload);
      setOpen(true);
      if (payload.defaultQuestion) {
        handleSendMessage(payload.defaultQuestion, payload.contextData);
      }
    });
  }, []);

  const buildSystemPrompt = (extraContext?: string): string => {
    return buildFullSystemPrompt(rawData, extraContext);
  };

  const handleSendMessage = async (text: string, extraContext?: string) => {
    if (!text.trim()) return;
    if (!hasLLMConfig()) {
      setError('请先配置大模型 API');
      return;
    }
    setError('');

    const userMsg = text.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    // 先尝试在本地数据查询
    const queryResult = queryData(userMsg, rawData);
    let finalUserMsg = userMsg;
    if (queryResult.matched) {
      finalUserMsg = `${userMsg}\n\n[系统已自动查询到以下数据供参考]\n${queryResult.summary}`;
    }

    const systemContent = buildSystemPrompt(extraContext);
    const history: LLMMessage[] = messages.map((m) => ({ role: m.role, content: m.content } as LLMMessage));

    const llmMessages: LLMMessage[] = [
      { role: 'system', content: systemContent },
      ...history,
      { role: 'user', content: finalUserMsg },
    ];

    abortRef.current = new AbortController();
    let assistantContent = '';

    try {
      await callLLM(
        llmMessages,
        (chunk, done) => {
          if (done) {
            setLoading(false);
            setMessages((prev) => {
              const next = [...prev];
              if (next[next.length - 1]?.role === 'assistant') {
                next[next.length - 1].content = assistantContent;
              } else {
                next.push({ role: 'assistant', content: assistantContent });
              }
              return next;
            });
          } else {
            assistantContent += chunk;
            setMessages((prev) => {
              const next = [...prev];
              if (next[next.length - 1]?.role === 'assistant') {
                next[next.length - 1].content = assistantContent;
              } else {
                next.push({ role: 'assistant', content: assistantContent });
              }
              return next;
            });
          }
        },
        abortRef.current.signal
      );
    } catch (err: any) {
      setLoading(false);
      setError(err.message || '请求失败');
    }
  };

  const handleSend = () => {
    handleSendMessage(input, context?.contextData);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          '对话已清空。我是你的 AI 数据助手，已经学习了众引传播集团的媒介业务知识。你可以继续提问。',
      },
    ]);
    setContext(null);
    setError('');
  };

  return (
    <>
      {/* 悬浮按钮 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
          aria-label="打开 AI 助手"
        >
          <Bot className="w-7 h-7" />
        </button>
      )}

      {/* 对话窗 */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[28rem] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium truncate">AI 数据助手</span>
              {context && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded truncate max-w-[80px]" title={context.pageName}>
                  {context.pageName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={clearChat}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                title="清空对话"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 消息区 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] text-sm px-4 py-2 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white border text-gray-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-white border text-gray-400 px-4 py-2 rounded-2xl rounded-bl-none shadow-sm text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-center">
                <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{error}</span>
                  <button onClick={onOpenConfig} className="underline font-medium flex-shrink-0">
                    去配置
                  </button>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区 */}
          <div className="p-3 bg-white border-t">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入问题，按 Enter 发送..."
                className="min-h-[44px] max-h-24 resize-none text-sm"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="h-auto px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={onOpenConfig}
                className="text-xs text-gray-400 hover:text-blue-600 underline"
              >
                模型设置
              </button>
              <span className="text-[10px] text-gray-300">AI 生成内容仅供参考</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
