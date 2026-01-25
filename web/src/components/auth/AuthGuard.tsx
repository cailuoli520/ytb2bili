'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseUserStore } from '@/store/firebaseUserStore';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * 认证守卫组件
 * 用于保护需要登录才能访问的页面
 */
export default function AuthGuard({ 
  children, 
  fallback,
  redirectTo 
}: AuthGuardProps) {
  const router = useRouter();
  const { currentUser, firebaseUser, isInitialized, isLoading } = useFirebaseUserStore();

  useEffect(() => {
    // 等待认证状态初始化完成
    if (!isInitialized) return;

    // 如果用户未登录且指定了重定向路径
    if (!currentUser && !firebaseUser && redirectTo) {
      router.push(redirectTo);
    }
  }, [currentUser, firebaseUser, isInitialized, redirectTo, router]);

  // 显示加载状态
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 如果用户未登录
  if (!currentUser && !firebaseUser) {
    // 如果提供了 fallback，显示它
    if (fallback) {
      return <>{fallback}</>;
    }

    // 否则显示默认的未登录提示
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">请先登录</p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            去登录
          </a>
        </div>
      </div>
    );
  }

  // 用户已登录，渲染子组件
  return <>{children}</>;
}
