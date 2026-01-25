"use client";

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const [autoUpload, setAutoUpload] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const v = localStorage.getItem('biliup:autoUpload');
        return v === '1';
      } catch {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('biliup:autoUpload', autoUpload ? '1' : '0');
      } catch {
        // ignore
      }
    }
  }, [autoUpload]);

  return (
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-medium text-gray-900">设置</h2>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <label className="flex items-center justify-between bg-gray-50 p-4 rounded-md">
              <div>
                <div className="text-sm font-medium">自动上传</div>
                <div className="text-xs text-gray-500">视频提交后自动开始上传任务</div>
              </div>
              <input
                type="checkbox"
                checked={autoUpload}
                onChange={(e) => setAutoUpload(e.target.checked)}
                className="w-5 h-5"
              />
            </label>

            <div className="bg-blue-50 p-4 rounded-md">
              <div className="text-sm text-blue-800">
                <strong>提示：</strong> 更多设置项将在后续版本中添加。
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
