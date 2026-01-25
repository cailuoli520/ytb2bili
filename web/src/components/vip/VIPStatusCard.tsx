'use client';

import { useFirebaseUserStore } from '@/store/firebaseUserStore';
import { Crown, Calendar, TrendingUp } from 'lucide-react';
import VIPBadge from './VIPBadge';

export default function VIPStatusCard() {
  const { firebaseUser, vipStatus, isVIP, userProfile } = useFirebaseUserStore();

  if (!firebaseUser) {
    return null;
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const getDaysRemaining = (expireTime?: string) => {
    if (!expireTime) return null;
    const now = new Date();
    const expire = new Date(expireTime);
    const diff = expire.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const daysRemaining = getDaysRemaining(vipStatus?.expire_time);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            会员状态
          </h3>
          <VIPBadge />
        </div>
        {isVIP() && (
          <Crown className="w-8 h-8 text-purple-600" />
        )}
      </div>

      {isVIP() ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-gray-600">到期时间</p>
              <p className="font-medium text-gray-900">
                {formatDate(vipStatus?.expire_time)}
              </p>
            </div>
          </div>

          {daysRemaining !== null && (
            <div className="flex items-center gap-3 text-sm">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-gray-600">剩余天数</p>
                <p className="font-medium text-gray-900">
                  {daysRemaining} 天
                  {daysRemaining < 7 && (
                    <span className="ml-2 text-orange-600">即将到期</span>
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-purple-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">当前算力</span>
              <span className="text-lg font-bold text-purple-600">
                {userProfile?.power || 0}
              </span>
            </div>
          </div>

          <button className="w-full mt-4 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            续费会员
          </button>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-600 mb-4">
            您还不是会员，升级会员享受更多特权
          </p>
          <a
            href="/vip"
            className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            立即开通
          </a>
        </div>
      )}
    </div>
  );
}
