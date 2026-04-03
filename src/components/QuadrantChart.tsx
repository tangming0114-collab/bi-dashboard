import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Cell, Tooltip } from 'recharts';

// Recharts + React 19 类型兼容 workaround
const RefLine = ReferenceLine as any;
import type { QuadrantData } from '@/types';

interface QuadrantChartProps {
  data: QuadrantData[];
  groupName: string;
  color: string;
}

const groupColors: Record<string, string> = {
  'Elite': '#52C41A',
  'Promise': '#FF9A56',
  'Rocket': '#13C2C2',
  'C star': '#722ED1',
  'OOPs': '#FAAD14',
  'Sparks': '#1890FF'
};

// 自定义Tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const name = data.媒介?.split(' ')[0] || data.媒介;
    return (
      <div className="bg-white p-3 border rounded shadow-lg">
        <p className="font-bold text-gray-800">{name}</p>
        <p className="text-sm text-gray-600">下单量: ¥{(data.下单量 / 10000).toFixed(2)}万</p>
        <p className="text-sm text-gray-600">返点率: {data.返点率.toFixed(2)}%</p>
        <p className="text-sm text-gray-600">组内占比: {(data.占比 * 100).toFixed(2)}%</p>
      </div>
    );
  }
  return null;
};

export function QuadrantChart({ data, groupName, color }: QuadrantChartProps) {
  const { avgAmount, avgRebate, xMax, yMax, xMin, yMin } = useMemo(() => {
    if (data.length === 0) {
      return { avgAmount: 0, avgRebate: 0, xMax: 100, yMax: 100, xMin: 0, yMin: 0 };
    }
    // 使用数据中的平均值
    const avgAmount = data[0]?.平均下单量 || 0;
    const avgRebate = data[0]?.平均返点率 || 0;

    // 智能计算坐标轴范围 - 根据实际数据分布
    const allXValues = data.map(d => d.下单量);
    const allYValues = data.map(d => d.返点率);

    const maxX = Math.max(...allXValues);
    const minX = Math.min(...allXValues);
    const maxY = Math.max(...allYValues);
    const minY = Math.min(...allYValues);

    // 添加一些边距，但避免显示大片空白区域
    const xMax = maxX * 1.1;
    const xMin = Math.max(0, minX * 0.9);
    const yMax = maxY * 1.1;
    const yMin = Math.max(0, minY * 0.9);

    return { avgAmount, avgRebate, xMax, yMax, xMin, yMin };
  }, [data]);

  const chartColor = groupColors[groupName] || color;

  // 如果没有数据，显示提示
  if (data.length === 0) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center">
        <p className="text-gray-500">暂无数据</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[550px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 60, right: 40, bottom: 60, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          
          {/* X轴 - 下单量 */}
          <XAxis
            type="number"
            dataKey="下单量"
            name="下单量"
            domain={[xMin, xMax]}
            tickFormatter={(value: number) => `¥${(value / 10000).toFixed(0)}万`}
            label={{ value: '下单量 → 越靠右越高', position: 'bottom', offset: 20, fontSize: 12, fontWeight: 'bold' }}
          />
          
          {/* Y轴 - 返点率 */}
          <YAxis 
            type="number" 
            dataKey="返点率" 
            name="返点率"
            domain={[yMin, yMax]}
            tickFormatter={(value: number) => `${value.toFixed(0)}%`}
            label={{ value: '返点率（%）→ 越靠上越高', angle: -90, position: 'insideLeft', fontSize: 12, fontWeight: 'bold' }}
          />
          
          {/* Tooltip */}
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          
          {/* 原点十字线 - 使用平均下单量和加权平均返点率 */}
          <RefLine x={avgAmount} stroke="#dc2626" strokeDasharray="5 5" strokeWidth={2} />
          <RefLine y={avgRebate} stroke="#dc2626" strokeDasharray="5 5" strokeWidth={2} />
          
          {/* 散点 - 使用圆点大小 */}
          <Scatter data={data} fill={chartColor}>
            {data.map((_entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={chartColor}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
          </Scatter>

        </ScatterChart>
      </ResponsiveContainer>
      
      {/* 原点标注 - 使用SVG坐标 */}
      <div
        className="absolute text-xs font-bold text-red-600 bg-white px-2 py-1 rounded border border-red-500 z-10"
        style={{
          left: `calc(60px + ((${avgAmount} - ${xMin}) / (${xMax} - ${xMin})) * (100% - 100px))`,
          bottom: '45px',
          transform: 'translateX(-50%)'
        }}
      >
        平均: ¥{(avgAmount / 10000).toFixed(1)}万
      </div>
      
      <div 
        className="absolute text-xs font-bold text-red-600 bg-white px-2 py-1 rounded border border-red-500 z-10"
        style={{ 
          left: '45px', 
          bottom: `calc(60px + ((${avgRebate} - ${yMin}) / (${yMax} - ${yMin})) * (100% - 120px))`,
          transform: 'translateY(50%)'
        }}
      >
        平均: {avgRebate.toFixed(1)}%
      </div>
      
      {/* 象限标签 */}
      <div className="absolute top-16 right-6 bg-green-100 border-2 border-green-500 rounded-lg px-3 py-2 text-center z-10">
        <div className="text-sm font-bold text-green-700">象限1 优质媒介</div>
        <div className="text-xs text-green-600">高下单量 + 高返点率</div>
      </div>

      <div className="absolute top-16 left-6 bg-orange-100 border-2 border-orange-500 rounded-lg px-3 py-2 text-center z-10">
        <div className="text-sm font-bold text-orange-700">象限2 议价型媒介</div>
        <div className="text-xs text-orange-600">低下单量 + 高返点率</div>
      </div>

      <div className="absolute bottom-20 left-6 bg-gray-100 border-2 border-gray-500 rounded-lg px-3 py-2 text-center z-10">
        <div className="text-sm font-bold text-gray-700">象限3 待提升媒介</div>
        <div className="text-xs text-gray-600">低下单量 + 低返点率</div>
      </div>

      <div className="absolute bottom-20 right-6 bg-blue-100 border-2 border-blue-500 rounded-lg px-3 py-2 text-center z-10">
        <div className="text-sm font-bold text-blue-700">象限4 规模型媒介</div>
        <div className="text-xs text-blue-600">高下单量 + 低返点率</div>
      </div>
    </div>
  );
}
