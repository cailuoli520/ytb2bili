'use client';

import { ReactNode } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * 全局认证提供者
 * 为客户端组件提供认证上下文
 * Firebase 认证会在 firebaseUserStore 初始化时自动启动
 */
export default function AuthProvider({ children }: AuthProviderProps) {
  return <>{children}</>;
}
