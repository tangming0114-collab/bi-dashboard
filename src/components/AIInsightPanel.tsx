import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Copy, Check, Sparkles } from 'lucide-react';

interface AIInsightPanelProps {
  title?: string;
  content: string;
  loading: boolean;
  onRegenerate?: () => void;
}

export function AIInsightPanel({
  title = 'AI 深度分析',
  content,
  loading,
  onRegenerate,
}: AIInsightPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="mt-4 border-purple-100 bg-gradient-to-br from-purple-50/40 to-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2 text-purple-700">
            <Sparkles className="w-4 h-4" />
            {title}
          </div>
          <div className="flex items-center gap-2">
            {onRegenerate && (
              <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                重新生成
              </Button>
            )}
            {content && (
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? '已复制' : '复制'}
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-3 text-purple-600 py-4">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">AI 正在分析数据，请稍候...</span>
          </div>
        ) : content ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
        ) : (
          <div className="text-sm text-gray-400 py-2">点击上方按钮生成 AI 分析</div>
        )}
      </CardContent>
    </Card>
  );
}
