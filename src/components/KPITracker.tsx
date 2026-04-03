import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';

interface KPITrackerProps {
  // 4个核心组的统计数据
  eliteStats: GroupKPIStats;
  oopsStats: GroupKPIStats;
  rocketStats: GroupKPIStats;
  cstarStats: GroupKPIStats;
}

interface GroupKPIStats {
  组别: string;
  下单量: number;      // 排除走单 + 仅报备合作的下单量
  返点率: number;      // 排除走单 + 仅报备合作的平均返点率
}

const TARGET_AMOUNT = 730000000; // 7.3亿
const TARGET_REBATE = 28.68;     // 28.68%

export function KPITracker({ eliteStats, oopsStats, rocketStats, cstarStats }: KPITrackerProps) {
  // 汇总4个组的KPI数据
  const totalAmount = eliteStats.下单量 + oopsStats.下单量 + rocketStats.下单量 + cstarStats.下单量;
  
  // 计算加权平均返点率
  const totalOrders = totalAmount; // 用下单量作为权重
  const weightedRebate = totalOrders > 0
    ? (eliteStats.下单量 * eliteStats.返点率 + 
       oopsStats.下单量 * oopsStats.返点率 + 
       rocketStats.下单量 * rocketStats.返点率 + 
       cstarStats.下单量 * cstarStats.返点率) / totalOrders
    : 0;

  // 完成进度
  const amountProgress = Math.min((totalAmount / TARGET_AMOUNT) * 100, 100);
  const rebateProgress = Math.min((weightedRebate / TARGET_REBATE) * 100, 100);

  // 是否达标
  const amountMet = totalAmount >= TARGET_AMOUNT;
  const rebateMet = weightedRebate >= TARGET_REBATE;

  // 各组完成进度
  const groupProgress = [
    { name: 'Elite', ...eliteStats },
    { name: 'OOPs', ...oopsStats },
    { name: 'Rocket', ...rocketStats },
    { name: 'C star', ...cstarStats },
  ];

  return (
    <Card className="mb-6 border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="w-5 h-5 text-blue-600" />
          2026年核心KPI追踪
          <span className="text-xs font-normal text-gray-500 ml-2">
            (Elite + OOPs + Rocket + C star)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 核心KPI指标 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 下单量KPI */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-700">下单量目标</span>
              </div>
              <div className="flex items-center gap-2">
                {amountMet ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                )}
                <span className={`text-sm font-medium ${amountMet ? 'text-green-600' : 'text-orange-600'}`}>
                  {amountMet ? '已达标' : '进行中'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  当前: <span className="font-bold text-blue-600">¥{(totalAmount / 100000000).toFixed(4)}亿</span>
                </span>
                <span className="text-gray-500">
                  目标: ¥{(TARGET_AMOUNT / 100000000).toFixed(2)}亿
                </span>
              </div>
              <Progress 
                value={amountProgress} 
                className="h-3"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>完成度: {amountProgress.toFixed(2)}%</span>
                <span>还差: ¥{Math.max(0, (TARGET_AMOUNT - totalAmount) / 100000000).toFixed(4)}亿</span>
              </div>
            </div>
          </div>

          {/* 返点率KPI */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-gray-700">返点率目标</span>
              </div>
              <div className="flex items-center gap-2">
                {rebateMet ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                <span className={`text-sm font-medium ${rebateMet ? 'text-green-600' : 'text-red-600'}`}>
                  {rebateMet ? '已达标' : '未达标'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  当前: <span className={`font-bold ${rebateMet ? 'text-green-600' : 'text-red-600'}`}>{weightedRebate.toFixed(2)}%</span>
                </span>
                <span className="text-gray-500">
                  目标: ≥{TARGET_REBATE}%
                </span>
              </div>
              <Progress 
                value={rebateProgress} 
                className="h-3"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>完成度: {rebateProgress.toFixed(2)}%</span>
                <span>
                  {rebateMet 
                    ? `超出: +${(weightedRebate - TARGET_REBATE).toFixed(2)}%` 
                    : `还差: ${(TARGET_REBATE - weightedRebate).toFixed(2)}%`
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 各组明细 */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">各组贡献明细（排除走单 + 仅报备合作）</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {groupProgress.map((group) => (
              <div 
                key={group.name} 
                className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm"
              >
                <div className="text-sm font-medium text-gray-600 mb-1">{group.name}组</div>
                <div className="space-y-1">
                  <div className="text-lg font-bold text-blue-600">
                    ¥{(group.下单量 / 10000).toFixed(0)}万
                  </div>
                  <div className={`text-sm ${group.返点率 >= TARGET_REBATE ? 'text-green-600' : 'text-orange-600'}`}>
                    返点率: {group.返点率.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 统计口径说明 */}
        <div className="mt-4 pt-3 border-t text-xs text-gray-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>统计口径：下单量包含所有数据；返点率仅统计「排除走单+报备合作」| 数据实时计算</span>
        </div>
      </CardContent>
    </Card>
  );
}
