'use client';

import { useState } from 'react';
import { useFirebaseUserStore } from '@/store/firebaseUserStore';
import { Mail, Lock, User, Loader2 } from 'lucide-react';

export default function FirebaseAuthForm() {
  const { signInWithEmail, signUpWithEmail, isLoading } = useFirebaseUserStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email || !formData.password) {
      setError('请填写所有必填字段');
      return;
    }

    if (isSignUp && !formData.displayName) {
      setError('请输入用户名');
      return;
    }

    try {
      if (isSignUp) {
        await signUpWithEmail(formData.email, formData.password, formData.displayName);
      } else {
        await signInWithEmail(formData.email, formData.password);
      }
      // 登录成功后，可以跳转到其他页面
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || (isSignUp ? '注册失败' : '登录失败'));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isSignUp ? '创建账号' : '欢迎回来'}
          </h2>
          <p className="text-gray-600">
            {isSignUp ? '注册即可开始使用' : '登录访问您的账户'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="请输入用户名"
                  required={isSignUp}
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              邮箱地址
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            {isSignUp && (
              <p className="mt-1 text-xs text-gray-500">密码至少6个字符</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {isSignUp ? '注册中...' : '登录中...'}
              </span>
            ) : (
              <span>{isSignUp ? '注册' : '登录'}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            {isSignUp ? '已有账号？立即登录' : '没有账号？立即注册'}
          </button>
        </div>
      </div>
    </div>
  );
}
