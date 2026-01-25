'use client';

import { ReactNode } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import FirebaseLogin from '@/components/auth/FirebaseLogin';
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
  // 注意：这里我们拦截了 children 的渲染，直接显示登录页
  // 这样每个页面都不需要单独处理登录状态了
  if (!user) {
    // 检查当前路径是否是公开路径的逻辑可以在这里添加，如果需要的话
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            YTB2BILI Web
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            登录以管理您的视频任务
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <FirebaseLogin onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      </div>
    );
  }

  // 已登录，渲染布局和子组件
  return (
    <AppLayout user={user} onLogout={handleLogout}>
      {children}
    </AppLayout>
  );
}
