'use client';

import { ReactNode } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import AdminLogin from '@/components/auth/AdminLogin';
import { useAuth } from '@/hooks/useAuth';

interface RootLayoutClientProps {
  children: ReactNode;
}

export default function RootLayoutClient({ children }: RootLayoutClientProps) {
  const { user, loading, handleLoginSuccess, handleLogout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 如果未登录，显示登录页面
  if (!user) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // 已登录，渲染布局和子组件
  return (
    <AppLayout user={user} onLogout={handleLogout}>
      {children}
    </AppLayout>
  );
}
