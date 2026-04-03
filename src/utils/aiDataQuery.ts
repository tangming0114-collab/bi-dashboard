import { extractGroup, getCoopType } from './dataProcessor';

export interface QueryResult {
  matched: boolean;
  summary: string;
  detail?: any;
}

function formatWan(n: number): string {
  return `¥${(n / 10000).toFixed(1)}万`;
}

function calcRebate(amount: number, net: number): number {
  return amount > 0 ? ((amount - net) / amount) * 100 : 0;
}

function getGroup(row: any): string {
  return extractGroup(row['排期申请人所属组别']);
}

/**
 * 根据用户问题，在 rawData 中执行聚合查询
 */
export function queryData(question: string, rawData: any[]): QueryResult {
  if (!rawData || rawData.length === 0) {
    return { matched: false, summary: '暂无数据' };
  }

  const q = question.toLowerCase();

  // 1. 返点率最高的组 / 各组返点率
  if (q.includes('返点率最高的组') || q.includes('哪组返点率') || q.includes('各组返点率')) {
    const groupMap: Record<string, { amount: number; net: number; count: number }> = {};
    rawData.forEach((row) => {
      const group = getGroup(row);
      if (!groupMap[group]) groupMap[group] = { amount: 0, net: 0, count: 0 };
      groupMap[group].amount += Number(row['Kol刊例单价(元)']) || 0;
      groupMap[group].net += Number(row['kol净价(元)']) || 0;
      groupMap[group].count += 1;
    });
    const list = Object.entries(groupMap)
      .map(([group, d]) => ({
        group,
        rebate: calcRebate(d.amount, d.net),
        amount: d.amount,
        count: d.count,
      }))
      .sort((a, b) => b.rebate - a.rebate);
    const top = list[0];
    return {
      matched: true,
      summary: `返点率最高的组是 ${top.group}（${top.rebate.toFixed(2)}%），共 ${top.count} 单，总金额 ${formatWan(top.amount)}。`,
      detail: list,
    };
  }

  // 2. Top10 客户
  if ((q.includes('top') || q.includes('top10')) && q.includes('客户')) {
    const map: Record<string, { amount: number; net: number; count: number }> = {};
    rawData.forEach((row) => {
      const key = row['对客项目客户名称'] || '未知客户';
      if (!map[key]) map[key] = { amount: 0, net: 0, count: 0 };
      map[key].amount += Number(row['Kol刊例单价(元)']) || 0;
      map[key].net += Number(row['kol净价(元)']) || 0;
      map[key].count += 1;
    });
    const list = Object.entries(map)
      .map(([name, d]) => ({ name, rebate: calcRebate(d.amount, d.net), amount: d.amount, count: d.count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    return {
      matched: true,
      summary: `Top10 客户：\n${list.map((c, i) => `${i + 1}. ${c.name}：${formatWan(c.amount)} / ${c.count}单 / 返点率${c.rebate.toFixed(1)}%`).join('\n')}`,
      detail: list,
    };
  }

  // 3. Top10 品牌
  if ((q.includes('top') || q.includes('top10')) && q.includes('品牌')) {
    const map: Record<string, { amount: number; net: number; count: number }> = {};
    rawData.forEach((row) => {
      const key = row['投放品牌'] || '未知品牌';
      if (!map[key]) map[key] = { amount: 0, net: 0, count: 0 };
      map[key].amount += Number(row['Kol刊例单价(元)']) || 0;
      map[key].net += Number(row['kol净价(元)']) || 0;
      map[key].count += 1;
    });
    const list = Object.entries(map)
      .map(([name, d]) => ({ name, rebate: calcRebate(d.amount, d.net), amount: d.amount, count: d.count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    return {
      matched: true,
      summary: `Top10 品牌：\n${list.map((b, i) => `${i + 1}. ${b.name}：${formatWan(b.amount)} / ${b.count}单 / 返点率${b.rebate.toFixed(1)}%`).join('\n')}`,
      detail: list,
    };
  }

  // 4. Top10 媒介
  if ((q.includes('top') || q.includes('top10')) && (q.includes('媒介') || q.includes('申请人'))) {
    const map: Record<string, { amount: number; net: number; count: number }> = {};
    rawData.forEach((row) => {
      const key = row['排期申请人'] || '未知媒介';
      if (!map[key]) map[key] = { amount: 0, net: 0, count: 0 };
      map[key].amount += Number(row['Kol刊例单价(元)']) || 0;
      map[key].net += Number(row['kol净价(元)']) || 0;
      map[key].count += 1;
    });
    const list = Object.entries(map)
      .map(([name, d]) => ({ name, rebate: calcRebate(d.amount, d.net), amount: d.amount, count: d.count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    return {
      matched: true,
      summary: `Top10 媒介：\n${list.map((m, i) => `${i + 1}. ${m.name}：${formatWan(m.amount)} / ${m.count}单 / 返点率${m.rebate.toFixed(1)}%`).join('\n')}`,
      detail: list,
    };
  }

  // 5. 走单占比
  if (q.includes('走单') && (q.includes('占比') || q.includes('多少') || q.includes('比例'))) {
    const zoudan = rawData.filter((r) => r['是否客户指定走单'] === '是');
    const zoudanAmount = zoudan.reduce((sum, r) => sum + (Number(r['Kol刊例单价(元)']) || 0), 0);
    const totalAmount = rawData.reduce((sum, r) => sum + (Number(r['Kol刊例单价(元)']) || 0), 0);
    const zoudanRatio = totalAmount > 0 ? ((zoudanAmount / totalAmount) * 100).toFixed(1) : 0;
    return {
      matched: true,
      summary: `走单业务共 ${zoudan.length} 单（占比 ${((zoudan.length / rawData.length) * 100).toFixed(1)}%），金额 ${formatWan(zoudanAmount)}（占总金额 ${zoudanRatio}%）。`,
      detail: { zoudanCount: zoudan.length, totalCount: rawData.length, zoudanAmount, totalAmount },
    };
  }

  // 6. 报备 vs 非报备
  if ((q.includes('报备') || q.includes('非报备')) && (q.includes('占比') || q.includes('多少') || q.includes('比例') || q.includes('各占'))) {
    const map: Record<string, { count: number; amount: number; net: number }> = { 报备: { count: 0, amount: 0, net: 0 }, 非报备: { count: 0, amount: 0, net: 0 }, 其它: { count: 0, amount: 0, net: 0 } };
    rawData.forEach((row) => {
      const type = getCoopType(row['合作方式']);
      map[type].count += 1;
      map[type].amount += Number(row['Kol刊例单价(元)']) || 0;
      map[type].net += Number(row['kol净价(元)']) || 0;
    });
    return {
      matched: true,
      summary: [
        `报备合作：${map['报备'].count} 单（${((map['报备'].count / rawData.length) * 100).toFixed(1)}%），金额 ${formatWan(map['报备'].amount)}，返点率 ${calcRebate(map['报备'].amount, map['报备'].net).toFixed(1)}%`,
        `非报备合作：${map['非报备'].count} 单（${((map['非报备'].count / rawData.length) * 100).toFixed(1)}%），金额 ${formatWan(map['非报备'].amount)}，返点率 ${calcRebate(map['非报备'].amount, map['非报备'].net).toFixed(1)}%`,
        `其它：${map['其它'].count} 单（${((map['其它'].count / rawData.length) * 100).toFixed(1)}%），金额 ${formatWan(map['其它'].amount)}。`,
      ].join('\n'),
      detail: map,
    };
  }

  // 7. 平台分布
  if (q.includes('平台') && (q.includes('分布') || q.includes('占比') || q.includes('哪个平台'))) {
    const map: Record<string, { count: number; amount: number; net: number }> = {};
    rawData.forEach((row) => {
      const p = row['发布平台'] || '未知平台';
      if (!map[p]) map[p] = { count: 0, amount: 0, net: 0 };
      map[p].count += 1;
      map[p].amount += Number(row['Kol刊例单价(元)']) || 0;
      map[p].net += Number(row['kol净价(元)']) || 0;
    });
    const list = Object.entries(map)
      .map(([name, d]) => ({ name, count: d.count, amount: d.amount, rebate: calcRebate(d.amount, d.net) }))
      .sort((a, b) => b.amount - a.amount);
    return {
      matched: true,
      summary: `各平台分布：\n${list.map((p, i) => `${i + 1}. ${p.name}：${p.count}单 / ${formatWan(p.amount)} / 返点率${p.rebate.toFixed(1)}%`).join('\n')}`,
      detail: list,
    };
  }

  // 8. 采买方式分布
  if (q.includes('采买方式') || q.includes('采买')) {
    const map: Record<string, { count: number; amount: number; net: number }> = {};
    rawData.forEach((row) => {
      const p = row['采买方式'] || '未知';
      if (!map[p]) map[p] = { count: 0, amount: 0, net: 0 };
      map[p].count += 1;
      map[p].amount += Number(row['Kol刊例单价(元)']) || 0;
      map[p].net += Number(row['kol净价(元)']) || 0;
    });
    const list = Object.entries(map)
      .map(([name, d]) => ({ name, count: d.count, amount: d.amount, rebate: calcRebate(d.amount, d.net) }))
      .sort((a, b) => b.amount - a.amount);
    return {
      matched: true,
      summary: `各采买方式分布：\n${list.map((p, i) => `${i + 1}. ${p.name}：${p.count}单 / ${formatWan(p.amount)} / 返点率${p.rebate.toFixed(1)}%`).join('\n')}`,
      detail: list,
    };
  }

  // 9. 特定品牌 / 媒介 / 客户 / 达人 查询（简单模糊匹配）
  const keywords = ['品牌', '媒介', '客户', '达人'];
  for (const kw of keywords) {
    if (q.includes(kw)) {
      // 尝试从问题中提取名称（简单的 heuristic）
      // 用户可能问 "巴黎欧莱雅的数据" 或 "扈芸婷的业绩"
      // 这里我们先尝试在数据中找匹配项
      const fieldMap: Record<string, string> = {
        品牌: '投放品牌',
        媒介: '排期申请人',
        客户: '对客项目客户名称',
        达人: '达人昵称',
      };
      const field = fieldMap[kw];
      const values = Array.from(new Set(rawData.map((r) => r[field]).filter(Boolean)));
      const matchedValue = values.find((v) => q.includes((v as string).toLowerCase()));
      if (matchedValue) {
        const filtered = rawData.filter((r) => r[field] === matchedValue);
        const amount = filtered.reduce((sum, r) => sum + (Number(r['Kol刊例单价(元)']) || 0), 0);
        const net = filtered.reduce((sum, r) => sum + (Number(r['kol净价(元)']) || 0), 0);
        return {
          matched: true,
          summary: `${kw}「${matchedValue}」共 ${filtered.length} 单，总金额 ${formatWan(amount)}，返点率 ${calcRebate(amount, net).toFixed(1)}%。`,
          detail: { name: matchedValue, count: filtered.length, amount, net, rebate: calcRebate(amount, net) },
        };
      }
    }
  }

  // 未匹配到特定查询
  return { matched: false, summary: '' };
}
