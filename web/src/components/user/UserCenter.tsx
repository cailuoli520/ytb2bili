'use client';

import { useEffect } from 'react';
import { useFirebaseUserStore } from '@/store/firebaseUserStore';
import AuthGuard from '@/components/auth/AuthGuard';
import VIPStatusCard from '@/components/vip/VIPStatusCard';
import VIPBadge from '@/components/vip/VIPBadge';
import OrderList from '@/components/order/OrderList';
import { User, LogOut, Mail, Calendar } from 'lucide-react';

function UserCenterContent() {
  const { currentUser, firebaseUser, userProfile, signOut, refreshUserData } = useFirebaseUserStore();

  useEffect(() => {
    if (currentUser) {
      refreshUserData();
    }
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 用户信息卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {firebaseUser?.display_name || userProfile?.display_name || '用户'}
                  </h1>
                  <VIPBadge />
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{currentUser.email}</span>
                  </div>
                  {userProfile?.created_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>注册时间：{formatDate(userProfile.created_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>退出登录</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：VIP状态 */}
          <div className="lg:col-span-1">
            <VIPStatusCard />
          </div>

          {/* 右侧：订单列表 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <OrderList />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserCenter() {
  return (
    <AuthGuard>
      <UserCenterContent />
    </AuthGuard>
  );
}
