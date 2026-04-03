import { KPITracker } from '@/components/KPITracker';
import { KPIAnalyzer } from '@/components/KPIAnalyzer';
import { Upload } from 'lucide-react';

interface KPITrackingPageProps {
  rawData: any[];
  kpiStats: Record<string, { 组别: string; 下单量: number; 返点率: number }>;
  onUploadClick: () => void;
}

export function KPITrackingPage({ rawData, kpiStats, onUploadClick }: KPITrackingPageProps) {
  if (!rawData || rawData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <Upload className="w-12 h-12 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">欢迎使用KOL媒介BI看板</h2>
        <p className="text-gray-500 mb-6">请先上传Excel文件以查看2026年核心KPI追踪数据</p>
        <button
          onClick={onUploadClick}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          上传Excel文件
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI追踪 */}
      <KPITracker
        eliteStats={kpiStats['Elite']}
        oopsStats={kpiStats['OOPs']}
        rocketStats={kpiStats['Rocket']}
        cstarStats={kpiStats['C star']}
      />

      {/* KPI智能分析与建议 */}
      <KPIAnalyzer rawData={rawData} />
    </div>
  );
}
