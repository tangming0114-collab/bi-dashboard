import { useCallback, useRef } from 'react';
import { Upload } from 'lucide-react';
import { parseExcel, CORRECT_SHEET_NAME } from '@/utils/dataProcessor';

interface FileUploadProps {
  onUploadSuccess: (data: any[], fileName: string) => void;
  onSheetError: (sheetName: string) => void;
  onClose?: () => void;
}

export function FileUpload({ onUploadSuccess, onSheetError, onClose }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return;
    }

    try {
      const result = await parseExcel(file);
      
      if (!result.isValid) {
        // sheet名称不正确，显示错误提示
        onSheetError(result.sheetName);
        // 清空input，允许重新选择同一个文件
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        return;
      }
      
      // sheet名称正确，继续处理
      onUploadSuccess(result.data, file.name);
      onClose?.();
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('文件解析失败，请检查文件格式');
    }
  }, [onUploadSuccess, onSheetError, onClose]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div 
      className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          点击或拖拽上传Excel文件
        </h3>
        <p className="text-gray-500">
          支持 .xlsx, .xls 格式
        </p>
        <p className="text-sm text-gray-400 mt-2">
          请上传包含 "{CORRECT_SHEET_NAME}" 工作表的排期表
        </p>
      </label>
    </div>
  );
}
