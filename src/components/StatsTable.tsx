import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GroupStats, MediaData } from '@/types';

interface StatsTableProps {
  groupStats: GroupStats[];
  mediaData: MediaData[];
}

export function StatsTable({ groupStats, mediaData }: StatsTableProps) {
  // 格式化金额
  const formatAmount = (amount: number) => {
    return `¥${(amount / 10000).toFixed(2)}万`;
  };

  return (
    <div className="space-y-6">
      {/* 组别汇总表 */}
      <Card>
        <CardHeader>
          <CardTitle>组别汇总统计</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>组别</TableHead>
                <TableHead>媒介数</TableHead>
                <TableHead>下单量（刊例价）</TableHead>
                <TableHead>净价总和</TableHead>
                <TableHead>返点率</TableHead>
                <TableHead>订单数</TableHead>
                <TableHead>平均下单量</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupStats.map((group) => (
                <TableRow key={group.组别}>
                  <TableCell className="font-medium">{group.组别}</TableCell>
                  <TableCell>{group.媒介数}</TableCell>
                  <TableCell className="font-semibold text-blue-600">
                    {formatAmount(group.刊例价总和)}
                  </TableCell>
                  <TableCell>{formatAmount(group.净价总和)}</TableCell>
                  <TableCell className={`font-semibold ${group.返点率 >= 30 ? 'text-green-600' : group.返点率 >= 25 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {group.返点率.toFixed(1)}%
                  </TableCell>
                  <TableCell>{group.订单数}</TableCell>
                  <TableCell>{formatAmount(group.平均下单量)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 各组媒介明细 */}
      {groupStats.map((group) => {
        const groupMedia = mediaData
          .filter(m => m.组别 === group.组别)
          .sort((a, b) => b.刊例价总和 - a.刊例价总和);
        
        return (
          <Card key={group.组别}>
            <CardHeader>
              <CardTitle>{group.组别}组 - 媒介明细</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>排名</TableHead>
                    <TableHead>媒介</TableHead>
                    <TableHead>下单量（刊例价）</TableHead>
                    <TableHead>净价总和</TableHead>
                    <TableHead>返点率</TableHead>
                    <TableHead>订单数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupMedia.map((media, index) => (
                    <TableRow key={media.媒介}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{media.媒介}</TableCell>
                      <TableCell className="font-semibold">
                        {formatAmount(media.刊例价总和)}
                      </TableCell>
                      <TableCell>{formatAmount(media.净价总和)}</TableCell>
                      <TableCell className={`${media.返点率 >= 30 ? 'text-green-600' : media.返点率 >= 25 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {media.返点率.toFixed(1)}%
                      </TableCell>
                      <TableCell>{media.订单数}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
