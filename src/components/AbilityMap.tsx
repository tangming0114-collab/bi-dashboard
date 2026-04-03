import { useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, Users, Star } from 'lucide-react';

interface AbilityMapProps {
  rawData: any[];
}

interface MediaAbility {
  媒介: string;
  组别: string;
  下单量: number;
  返点率: number;
  订单数: number;
  综合得分: number;
  组内排名: number;
  组内百分位: number;
  相对平均分: number; // 与全媒介平均分的差异（百分比）
}

export function AbilityMap({ rawData }: AbilityMapProps) {
  const chartRef = useRef<ReactECharts>(null);

  // 提取组别名称
  const extractGroup = (groupStr: string): string => {
    if (!groupStr) return '未知';
    const parts = groupStr.split('|');
    return parts[parts.length - 1].trim();
  };

  // 计算媒介能力数据
  const mediaData = useMemo((): MediaAbility[] => {
    // 筛选报备合作且非走单的数据，并过滤异常数据（净价<=0可能是测试数据）
    const filteredData = rawData.filter(row => {
      const coopWay = row['合作方式'] || '';
      const isZoudan = row['是否客户指定走单'];
      const netPrice = Number(row['kol净价(元)']) || 0;
      
      // 剔除走单业务
      if (isZoudan === '是') return false;
      
      // 过滤异常数据（净价<=0可能是测试数据或异常）
      if (netPrice <= 0) return false;
      
      // 仅统计报备类型合作
      const baobeiKeywords = ['报备', '星图', '星任务', '微任务', '花火'];
      return baobeiKeywords.some(k => coopWay.includes(k));
    });

    // 按媒介汇总数据
    const mediaMap = new Map<string, {
      组别: string;
      下单量: number;
      返点总和: number;
      订单数: number;
    }>();

    filteredData.forEach(row => {
      const media = row['排期申请人'] || '';
      const group = extractGroup(row['排期申请人所属组别'] || '');
      const amount = Number(row['Kol刊例单价(元)']) || 0;
      const net = Number(row['kol净价(元)']) || 0;
      const fanDian = amount > 0 ? ((amount - net) / amount * 100) : 0;

      if (!media) return;

      if (!mediaMap.has(media)) {
        mediaMap.set(media, {
          组别: group,
          下单量: 0,
          返点总和: 0,
          订单数: 0
        });
      }

      const data = mediaMap.get(media)!;
      data.下单量 += amount;
      data.返点总和 += fanDian;
      data.订单数 += 1;
    });

    // 转换为数组并计算平均返点率
    let abilities: MediaAbility[] = Array.from(mediaMap.entries()).map(([媒介, data]) => ({
      媒介,
      组别: data.组别,
      下单量: data.下单量,
      返点率: data.订单数 > 0 ? data.返点总和 / data.订单数 : 0,
      订单数: data.订单数,
      综合得分: 0,
      组内排名: 0,
      组内百分位: 0,
      相对平均分: 0
    }));

    // Min-Max 标准化
    const minAmount = Math.min(...abilities.map(a => a.下单量));
    const maxAmount = Math.max(...abilities.map(a => a.下单量));
    const minFanDian = Math.min(...abilities.map(a => a.返点率));
    const maxFanDian = Math.max(...abilities.map(a => a.返点率));
    const minOrders = Math.min(...abilities.map(a => a.订单数));
    const maxOrders = Math.max(...abilities.map(a => a.订单数));

    // 计算综合得分
    abilities = abilities.map(a => {
      const amountScore = maxAmount > minAmount 
        ? (a.下单量 - minAmount) / (maxAmount - minAmount) 
        : 0;
      const fanDianScore = maxFanDian > minFanDian 
        ? (a.返点率 - minFanDian) / (maxFanDian - minFanDian) 
        : 0;
      const orderScore = maxOrders > minOrders 
        ? (a.订单数 - minOrders) / (maxOrders - minOrders) 
        : 0;

      const 综合得分 = (amountScore * 0.3 + fanDianScore * 0.5 + orderScore * 0.2) * 100;

      return {
        ...a,
        综合得分: Math.round(综合得分 * 10) / 10
      };
    });

    // 计算全媒介平均分
    const avgScore = abilities.reduce((sum, a) => sum + a.综合得分, 0) / abilities.length;

    // 计算每个媒介相对于平均分的差异（百分比）
    abilities = abilities.map(a => ({
      ...a,
      相对平均分: Math.round(((a.综合得分 - avgScore) / avgScore) * 100 * 10) / 10
    }));

    // 按组别计算组内排名和百分位
    const groupMap = new Map<string, MediaAbility[]>();
    abilities.forEach(a => {
      if (!groupMap.has(a.组别)) {
        groupMap.set(a.组别, []);
      }
      groupMap.get(a.组别)!.push(a);
    });

    groupMap.forEach((groupMembers) => {
      // 按综合得分排序
      groupMembers.sort((a, b) => b.综合得分 - a.综合得分);
      
      groupMembers.forEach((member, index) => {
        member.组内排名 = index + 1;
        member.组内百分位 = Math.round(((groupMembers.length - index) / groupMembers.length) * 100);
      });
    });

    return abilities;
  }, [rawData]);

  // 获取组别颜色
  const getGroupColor = (group: string): string => {
    const colors: Record<string, string> = {
      'Sparks': '#5470c6',
      'Promise': '#91cc75',
      'Elite': '#fac858',
      'OOPs': '#ee6666',
      'C star': '#73c0de',
      'Rocket': '#3ba272',
      '下单组': '#fc8452',
      '2ne1': '#9a60b4',
      '野达组': '#ea7ccc',
      'AdApex': '#ff9f7f'
    };
    return colors[group] || '#999';
  };

  // 统计信息
  const stats = useMemo(() => {
    if (mediaData.length === 0) return null;
    
    const avgScore = mediaData.reduce((sum, m) => sum + m.综合得分, 0) / mediaData.length;
    const avgRank = mediaData.reduce((sum, m) => sum + m.组内百分位, 0) / mediaData.length;
    const topMedia = mediaData.reduce((max, m) => m.综合得分 > max.综合得分 ? m : max, mediaData[0]);

    return {
      total: mediaData.length,
      avgScore: Math.round(avgScore * 10) / 10,
      avgRank: Math.round(avgRank * 10) / 10,
      topMedia
    };
  }, [mediaData]);

  // 计算图表所需的动态范围
  const chartRange = useMemo(() => {
    if (mediaData.length === 0) {
      return { minScore: 0, maxScore: 100, avgScore: 50 };
    }
    const scores = mediaData.map(m => m.综合得分);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    return { minScore, maxScore, avgScore };
  }, [mediaData]);

  // ECharts 配置
  const chartOption = useMemo(() => {
    const seriesData = mediaData.map(m => ({
      name: m.媒介,
      value: [m.综合得分, m.组内百分位, m.下单量, m.返点率, m.订单数, m.组别],
      itemStyle: {
        color: getGroupColor(m.组别)
      }
    }));

    // 获取所有组别
    const groups = Array.from(new Set(mediaData.map(m => m.组别)));

    // 动态计算X轴范围：根据实际数据分布，留出适当边距
    const { minScore, maxScore, avgScore } = chartRange;
    // 扩展范围，留出10%的边距
    const xMin = Math.max(0, Math.floor(minScore * 0.95));
    const xMax = Math.min(100, Math.ceil(maxScore * 1.05));
    // 参考线使用平均分
    const refLineX = Math.round(avgScore * 10) / 10;

    return {
      backgroundColor: 'transparent',
      grid: {
        left: '8%',
        right: '15%',
        top: '10%',
        bottom: '10%'
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: {
          color: '#374151'
        },
        formatter: (params: any) => {
          const [score, rank, amount, fanDian, orders, group] = params.value;
          return `
            <div style="font-weight:600;margin-bottom:8px;">${params.name}</div>
            <div style="color:#6b7280;font-size:12px;margin-bottom:4px;">组别: ${group}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
              <div>
                <div style="color:#9ca3af;font-size:11px;">综合得分</div>
                <div style="font-weight:600;color:#3b82f6;">${score.toFixed(1)}</div>
              </div>
              <div>
                <div style="color:#9ca3af;font-size:11px;">组内排名</div>
                <div style="font-weight:600;color:#8b5cf6;">前 ${rank}%</div>
              </div>
              <div>
                <div style="color:#9ca3af;font-size:11px;">下单量</div>
                <div style="font-weight:600;">¥${(amount / 10000).toFixed(1)}万</div>
              </div>
              <div>
                <div style="color:#9ca3af;font-size:11px;">返点率</div>
                <div style="font-weight:600;color:${fanDian >= 30 ? '#22c55e' : '#374151'};">${fanDian.toFixed(1)}%</div>
              </div>
              <div>
                <div style="color:#9ca3af;font-size:11px;">订单数</div>
                <div style="font-weight:600;">${orders} 单</div>
              </div>
            </div>
          `;
        }
      },
      legend: {
        data: groups,
        right: 10,
        top: 'center',
        orient: 'vertical',
        itemGap: 10,
        textStyle: {
          fontSize: 12,
          color: '#374151'
        }
      },
      xAxis: {
        name: `综合能力得分 (${xMin}-${xMax}分)`,
        nameLocation: 'middle',
        nameGap: 30,
        min: xMin,
        max: xMax,
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
            color: '#e5e7eb'
          }
        },
        axisLine: {
          lineStyle: {
            color: '#d1d5db'
          }
        },
        axisLabel: {
          color: '#6b7280'
        }
      },
      yAxis: {
        name: '组内百分位排名 (%)',
        nameLocation: 'middle',
        nameGap: 40,
        min: 0,
        max: 100,
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
            color: '#e5e7eb'
          }
        },
        axisLine: {
          lineStyle: {
            color: '#d1d5db'
          }
        },
        axisLabel: {
          color: '#6b7280'
        }
      },
      series: [
        {
          name: '媒介能力',
          type: 'scatter',
          symbolSize: (data: any) => {
            // 根据下单量调整气泡大小
            const amount = data[2];
            const minSize = 15;
            const maxSize = 60;
            const maxAmount = Math.max(...mediaData.map(m => m.下单量));
            const minAmount = Math.min(...mediaData.map(m => m.下单量));
            if (maxAmount === minAmount) return 25;
            return minSize + (amount - minAmount) / (maxAmount - minAmount) * (maxSize - minSize);
          },
          label: {
            show: true,
            formatter: (params: any) => {
              // 只显示名字（去掉英文名）
              const name = params.name.split(' ')[0];
              return name;
            },
            position: 'top',
            fontSize: 11,
            fontWeight: 'bold',
            color: '#374151',
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: [2, 4],
            borderRadius: 3
          },
          labelLayout: {
            hideOverlap: true
          },
          data: seriesData,
          markLine: {
            silent: true,
            lineStyle: {
              type: 'dashed',
              color: '#ef4444',
              width: 2
            },
            data: [
              { xAxis: refLineX, label: { formatter: `平均分: ${refLineX}`, position: 'insideEndTop' } },
              { yAxis: 50 }
            ]
          },
          markArea: {
            silent: true,
            itemStyle: {
              color: 'transparent',
              borderWidth: 0
            },
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: '#374151'
            },
            data: [
              [
                {
                  name: '明星媒介\n高能力·高排名',
                  xAxis: refLineX,
                  yAxis: 100,
                  itemStyle: {
                    color: 'rgba(34, 197, 94, 0.1)'
                  },
                  label: {
                    position: 'inside',
                    color: '#16a34a'
                  }
                },
                {
                  xAxis: xMax,
                  yAxis: 50
                }
              ],
              [
                {
                  name: '潜力媒介\n低能力·高排名',
                  xAxis: xMin,
                  yAxis: 100,
                  itemStyle: {
                    color: 'rgba(251, 191, 36, 0.1)'
                  },
                  label: {
                    position: 'inside',
                    color: '#ca8a04'
                  }
                },
                {
                  xAxis: refLineX,
                  yAxis: 50
                }
              ],
              [
                {
                  name: '稳固媒介\n高能力·低排名',
                  xAxis: refLineX,
                  yAxis: 50,
                  itemStyle: {
                    color: 'rgba(59, 130, 246, 0.1)'
                  },
                  label: {
                    position: 'inside',
                    color: '#2563eb'
                  }
                },
                {
                  xAxis: xMax,
                  yAxis: 0
                }
              ],
              [
                {
                  name: '待改进媒介\n低能力·低排名',
                  xAxis: xMin,
                  yAxis: 50,
                  itemStyle: {
                    color: 'rgba(239, 68, 68, 0.1)'
                  },
                  label: {
                    position: 'inside',
                    color: '#dc2626'
                  }
                },
                {
                  xAxis: refLineX,
                  yAxis: 0
                }
              ]
            ]
          }
        }
      ]
    };
  }, [mediaData, chartRange]);

  if (!rawData || rawData.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>请先上传数据以查看能力图谱</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">总媒介数</p>
                  <p className="text-xl font-bold text-gray-800">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Star className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">平均综合得分</p>
                  <p className="text-xl font-bold text-gray-800">{stats.avgScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">平均组内排名</p>
                  <p className="text-xl font-bold text-gray-800">{stats.avgRank}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">最高得分媒介</p>
                  <p className="text-sm font-bold text-gray-800 truncate max-w-[120px]">
                    {stats.topMedia.媒介.split(' ')[0]}
                  </p>
                  <p className="text-xs text-blue-600">{stats.topMedia.综合得分}分</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 能力图谱 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="w-5 h-5 text-blue-500" />
            媒介能力双维评估图
          </CardTitle>
          <p className="text-sm text-gray-500">
            基于报备合作数据，综合评估业务规模、议价能力和执行效率
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[1300px]">
            <ReactECharts
              ref={chartRef}
              option={chartOption}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
          
          {/* 图例说明 */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">评分维度说明</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">30%</span>
                </div>
                <div>
                  <p className="font-medium text-gray-700">业务规模（下单量）</p>
                  <p className="text-gray-500 text-xs">刊例价总和，反映商业价值</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-purple-600">50%</span>
                </div>
                <div>
                  <p className="font-medium text-gray-700">议价能力（返点率）</p>
                  <p className="text-gray-500 text-xs">平均议价水平，越高越好</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-green-600">20%</span>
                </div>
                <div>
                  <p className="font-medium text-gray-700">执行效率（合作频次）</p>
                  <p className="text-gray-500 text-xs">订单总行数，反映执行效率</p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              * 仅统计报备类型合作，剔除走单业务
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
