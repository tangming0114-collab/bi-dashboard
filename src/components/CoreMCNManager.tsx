import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCoreMCNList, addCoreMCN, deleteCoreMCN, updateCoreMCN } from '@/utils/coreMCNStorage';
import type { CoreMCN, IndustryType, CorePlatformType } from '@/types';

const INDUSTRIES: IndustryType[] = ['互联网电商', '食品', '母婴'];
const PLATFORMS: CorePlatformType[] = ['抖音', '小红书'];

interface CoreMCNManagerProps {
  onMCNChange?: () => void;
}

export function CoreMCNManager({ onMCNChange }: CoreMCNManagerProps) {
  const [mcnList, setMcnList] = useState<CoreMCN[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMCN, setEditingMCN] = useState<CoreMCN | null>(null);
  const [filterIndustry, setFilterIndustry] = useState<IndustryType | '全部'>('全部');
  const [filterPlatform, setFilterPlatform] = useState<CorePlatformType | '全部'>('全部');

  // 表单状态
  const [formName, setFormName] = useState('');
  const [formIndustry, setFormIndustry] = useState<IndustryType>('互联网电商');
  const [formPlatform, setFormPlatform] = useState<CorePlatformType>('抖音');

  // 加载MCN列表
  useEffect(() => {
    loadMCNList();
  }, []);

  const loadMCNList = async () => {
    const list = await getCoreMCNList();
    setMcnList(list);
  };

  // 筛选后的列表
  const filteredList = useMemo(() => {
    return mcnList.filter(mcn => {
      if (filterIndustry !== '全部' && mcn.industry !== filterIndustry) return false;
      if (filterPlatform !== '全部' && mcn.platform !== filterPlatform) return false;
      return true;
    });
  }, [mcnList, filterIndustry, filterPlatform]);

  // 按行业和平台分组统计
  const groupedStats = useMemo(() => {
    const stats: Record<string, number> = {};
    INDUSTRIES.forEach(ind => {
      PLATFORMS.forEach(plat => {
        const key = `${ind}-${plat}`;
        stats[key] = mcnList.filter(m => m.industry === ind && m.platform === plat).length;
      });
    });
    return stats;
  }, [mcnList]);

  // 刷新列表
  const refreshList = async () => {
    await loadMCNList();
    onMCNChange?.();
  };

  // 添加机构
  const handleAdd = async () => {
    if (!formName.trim()) return;
    await addCoreMCN({
      name: formName.trim(),
      industry: formIndustry,
      platform: formPlatform
    });
    setFormName('');
    setShowAddDialog(false);
    refreshList();
  };

  // 删除机构
  const handleDelete = async (id: string) => {
    if (confirm('确定要删除该核心机构吗？')) {
      await deleteCoreMCN(id);
      refreshList();
    }
  };

  // 开始编辑
  const startEdit = (mcn: CoreMCN) => {
    setEditingMCN(mcn);
    setFormName(mcn.name);
    setFormIndustry(mcn.industry);
    setFormPlatform(mcn.platform);
  };

  // 保存编辑
  const handleEditSave = async () => {
    if (!editingMCN || !formName.trim()) return;
    await updateCoreMCN(editingMCN.id, {
      name: formName.trim(),
      industry: formIndustry,
      platform: formPlatform
    });
    setEditingMCN(null);
    setFormName('');
    refreshList();
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingMCN(null);
    setFormName('');
  };

  return (
    <div className="space-y-4">
      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {INDUSTRIES.map(industry => (
          PLATFORMS.map(platform => {
            const key = `${industry}-${platform}`;
            const count = groupedStats[key] || 0;
            return (
              <Card key={key} className="bg-gray-50">
                <CardContent className="p-3">
                  <div className="text-xs text-gray-500">{industry}</div>
                  <div className="text-xs text-gray-400">{platform}</div>
                  <div className="text-xl font-bold text-blue-600 mt-1">{count}家</div>
                </CardContent>
              </Card>
            );
          })
        ))}
      </div>

      {/* 筛选和添加 */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterIndustry} onValueChange={(v) => setFilterIndustry(v as IndustryType | '全部')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="选择行业" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="全部">全部行业</SelectItem>
            {INDUSTRIES.map(ind => (
              <SelectItem key={ind} value={ind}>{ind}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPlatform} onValueChange={(v) => setFilterPlatform(v as CorePlatformType | '全部')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="选择平台" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="全部">全部平台</SelectItem>
            {PLATFORMS.map(plat => (
              <SelectItem key={plat} value={plat}>{plat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          添加机构
        </Button>
      </div>

      {/* 机构列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            核心机构列表 ({filteredList.length}家)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredList.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无核心机构数据</p>
              <p className="text-sm mt-1">点击"添加机构"按钮添加</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredList.map(mcn => (
                <div key={mcn.id} className="py-3 flex items-center justify-between group">
                  {editingMCN?.id === mcn.id ? (
                    // 编辑模式
                    <div className="flex-1 flex items-center gap-3">
                      <Input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-48"
                        placeholder="机构名称"
                      />
                      <Select value={formIndustry} onValueChange={(v) => setFormIndustry(v as IndustryType)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map(ind => (
                            <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={formPlatform} onValueChange={(v) => setFormPlatform(v as CorePlatformType)}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORMS.map(plat => (
                            <SelectItem key={plat} value={plat}>{plat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={handleEditSave}>保存</Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // 展示模式
                    <>
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-gray-800">{mcn.name}</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">{mcn.industry}</span>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">{mcn.platform}</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(mcn)}>
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(mcn.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加核心机构</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">机构名称</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="请输入机构名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">所属行业</label>
              <Select value={formIndustry} onValueChange={(v) => setFormIndustry(v as IndustryType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(ind => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">所属平台</label>
              <Select value={formPlatform} onValueChange={(v) => setFormPlatform(v as CorePlatformType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(plat => (
                    <SelectItem key={plat} value={plat}>{plat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
              <Button onClick={handleAdd} disabled={!formName.trim()}>添加</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
