import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Check, Loader2, Bot } from 'lucide-react';
import { getLLMConfig, saveLLMConfig, testLLMConnection, PRESETS } from '@/utils/llm';
import type { LLMConfig } from '@/utils/llm';

interface LLMConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LLMConfigDialog({ open, onOpenChange }: LLMConfigDialogProps) {
  const [config, setConfig] = useState<LLMConfig>(getLLMConfig());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (open) {
      setConfig(getLLMConfig());
      setTestResult(null);
    }
  }, [open]);

  const handlePreset = (key: keyof typeof PRESETS) => {
    const preset = PRESETS[key];
    setConfig((prev) => ({
      ...prev,
      baseUrl: preset.baseUrl,
      model: preset.model,
    }));
  };

  const handleSave = () => {
    saveLLMConfig(config);
    onOpenChange(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    // 先保存临时配置以便测试使用
    const prev = getLLMConfig();
    saveLLMConfig(config);
    try {
      await testLLMConnection();
      setTestResult({ success: true, message: '连接成功！' });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || '连接失败' });
    } finally {
      setTesting(false);
      // 恢复之前配置？不需要，因为用户还没点保存；但测试时写入的配置会被 getLLMConfig 读取
      // 如果测试失败，把原来的写回去避免污染
      if (testResult?.success === false) {
        saveLLMConfig(prev);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            AI 助手配置
          </DialogTitle>
          <DialogDescription>
            配置大模型 API，即可在看板中使用 AI 智能分析功能。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* 快速选择 */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => handlePreset(key)}
                type="button"
              >
                {PRESETS[key].name}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              placeholder="sk-..."
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            />
            <p className="text-xs text-gray-500">
              仅存储在浏览器本地，不会上传到服务器。
            </p>
          </div>

          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input
              placeholder="https://api.moonshot.cn/v1"
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Input
              placeholder="moonshot-v1-8k"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Temperature</Label>
            <Select
              value={String(config.temperature)}
              onValueChange={(v) => setConfig({ ...config, temperature: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0（最严谨）</SelectItem>
                <SelectItem value="0.5">0.5（平衡）</SelectItem>
                <SelectItem value="0.7">0.7（推荐）</SelectItem>
                <SelectItem value="1">1（最有创意）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {testResult && (
            <div
              className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                testResult.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {testResult.message}
            </div>
          )}

          <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              安全提示：前端直接调用大模型 API 会暴露 Key，建议仅用于内部测试；生产环境请通过后端代理调用。
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              取消
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing || !config.apiKey}
              className="flex-1"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              测试连接
            </Button>
            <Button onClick={handleSave} disabled={!config.apiKey} className="flex-1">
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
