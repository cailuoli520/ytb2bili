"use client";

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, XCircle, Link2, ExternalLink, AlertCircle, Loader2, Clock, Info, ShieldCheck, Unlink } from 'lucide-react';

interface AccountStatus {
  platform: string;
  name: string;
  connected: boolean;
  username?: string;
  avatar?: string;
  connectedAt?: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  isSupported: boolean;
}

export default function AccountsPage() {
  const { user, loading, handleLoginSuccess, handleRefreshStatus, handleLogout } = useAuth();
  const [accounts, setAccounts] = useState<AccountStatus[]>([
    {
      platform: 'bilibili',
      name: 'B站',
      connected: false,
      icon: '📺',
      color: 'bg-pink-500',
      bgColor: 'from-pink-500 to-pink-600',
      description: '绑定B站账号，自动发布视频到B站',
      isSupported: true
    },
    {
      platform: 'youtube',
      name: 'YouTube',
      connected: false,
      icon: '▶️',
      color: 'bg-red-600',
      bgColor: 'from-red-500 to-red-600',
      description: '绑定YouTube账号，同步管理国际平台',
      isSupported: true
    },
    {
      platform: 'douyin',
      name: '抖音',
      connected: false,
      icon: '🎵',
      color: 'bg-black',
      bgColor: 'from-black to-gray-800',
      description: '绑定抖音账号，自动发布短视频到抖音',
      isSupported: false
    },
    {
      platform: 'kuaishou',
      name: '快手',
      connected: false,
      icon: '⚡',
      color: 'bg-orange-500',
      bgColor: 'from-orange-500 to-orange-600',
      description: '绑定快手账号，覆盖更多用户群体',
      isSupported: false
    },
    {
      platform: 'wechat_channels',
      name: '微信视频号',
      connected: false,
      icon: '💬',
      color: 'bg-green-500',
      bgColor: 'from-green-500 to-green-600',
      description: '绑定微信视频号账号，拓展视频分发渠道',
      isSupported: false
    }
  ]);
  const [isChecking, setIsChecking] = useState(true);

  const checkAccountStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      // 这里调用后端API检查各平台账号绑定状态
      const apiBaseUrl = process.env.NODE_ENV === 'development' 
        ? '/api/v1'
        : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8096/api/v1';
      
      const response = await fetch(`${apiBaseUrl}/auth/accounts`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.code === 200 && data.data) {
          // 更新账号状态
          setAccounts(prev => prev.map(account => {
            const status = data.data[account.platform];
            if (status) {
              return {
                ...account,
                connected: status.connected,
                username: status.username,
                avatar: status.avatar,
                connectedAt: status.connected_at
              };
            }
            return account;
          }));
        }
      }
    } catch (error) {
      console.error('检查账号状态失败:', error);
    } finally {
      setIsChecking(false);
    }
  }, []); // 空依赖数组，因为函数内部没有使用外部变量

  useEffect(() => {
    if (user) {
      checkAccountStatus();
    } else {
      setIsChecking(false);
    }
  }, [user?.id, checkAccountStatus]); // 只依赖user.id而不是整个user对象

  const handleConnect = async (platform: string) => {
    try {
      const apiBaseUrl = process.env.NODE_ENV === 'development' 
        ? '/api/v1'
        : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8096/api/v1';
      
      // 打开OAuth授权窗口
      const authUrl = `${apiBaseUrl}/auth/${platform}/authorize`;
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      window.open(
        authUrl,
        `${platform}_auth`,
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // 监听授权成功消息
      window.addEventListener('message', (event) => {
        if (event.data.type === 'auth_success' && event.data.platform === platform) {
          checkAccountStatus();
        }
      });
    } catch (error) {
      console.error('连接账号失败:', error);
      alert('连接失败，请重试');
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!confirm(`确定要解绑${accounts.find(a => a.platform === platform)?.name}账号吗？`)) {
      return;
    }

    try {
      const apiBaseUrl = process.env.NODE_ENV === 'development' 
        ? '/api/v1'
        : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8096/api/v1';
      
      const response = await fetch(`${apiBaseUrl}/auth/${platform}/disconnect`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.code === 200) {
        checkAccountStatus();
      } else {
        alert(data.message || '解绑失败');
      }
    } catch (error) {
      console.error('解绑账号失败:', error);
      alert('解绑失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout user={user} onLogout={handleLogout}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">账号绑定管理</h2>
          <p className="text-gray-600 mt-2">绑定多个平台账号，实现视频多平台分发</p>
        </div>

        {/* 已绑定账号列表 */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            已绑定账号
          </h3>
          <div className="min-h-[200px]">
            {isChecking ? (
              <div className="text-center py-12 bg-white rounded-lg border shadow-sm">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-gray-400 mb-2" />
                <p className="text-gray-600 text-sm">加载中...</p>
              </div>
            ) : accounts.filter(a => a.connected).length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed shadow-sm">
                <Link2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 mb-1">暂无绑定账号</p>
                <p className="text-xs text-gray-400">请在下方选择平台进行绑定</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.filter(a => a.connected).map((account) => (
                  <div key={account.platform} className="group relative bg-white rounded-xl border hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden min-h-[280px] flex flex-col">
                    {/* 顶部装饰条 */}
                    <div className={`h-1.5 w-full ${account.color} flex-shrink-0`} />
                    
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 ${account.color} rounded-full flex items-center justify-center text-sm text-white shadow-sm`}>
                          {account.icon}
                        </div>
                        <span className="font-bold text-gray-900">{account.name}</span>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                        已连接
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 mb-6 min-h-[56px]">
                      <div className="relative w-14 h-14 flex-shrink-0">
                        {account.avatar ? (
                          <img
                            src={account.avatar}
                            alt={account.username}
                            className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const nextDiv = e.currentTarget.nextElementSibling as HTMLElement;
                              if (nextDiv) nextDiv.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-14 h-14 ${account.color} rounded-full flex items-center justify-center text-2xl text-white shadow-md ${account.avatar ? 'hidden' : ''}`}
                        >
                          {account.icon}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate" title={account.username}>{account.username}</h4>
                        <p className="text-xs text-gray-500 truncate mt-0.5">绑定时间：{account.connectedAt ? new Date(account.connectedAt).toLocaleDateString('zh-CN') : '刚刚'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400">上次同步</span>
                        <span className="text-xs font-medium text-gray-600">刚刚</span>
                      </div>
                      <button
                        onClick={() => handleDisconnect(account.platform)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-3 rounded-md transition-colors text-sm font-medium flex items-center space-x-1"
                      >
                        <Unlink className="h-3.5 w-3.5" />
                        <span>解绑</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>

        {/* 可绑定平台列表 */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600" />
            添加新平台
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => {
              const isBound = account.connected;
              return (
                <div
                  key={account.platform}
                  className={`relative group bg-white rounded-xl border p-6 transition-all duration-300 ${
                    !account.isSupported 
                      ? 'opacity-70 grayscale-[0.5] hover:opacity-100 hover:grayscale-0' 
                      : 'hover:border-blue-400 hover:shadow-lg hover:-translate-y-1'
                  }`}
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div
                      className={`w-16 h-16 ${account.color} rounded-2xl rotate-3 group-hover:rotate-0 transition-transform duration-300 flex items-center justify-center text-3xl text-white shadow-lg`}
                    >
                      {account.icon}
                    </div>
                    <div className="flex-1 w-full">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <h3 className="font-bold text-lg text-gray-900">{account.name}</h3>
                        {!account.isSupported && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
                            开发中
                          </span>
                        )}
                        {account.platform === 'bilibili' && (
                          <span className="text-[10px] bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full border border-pink-100">
                            热门
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-6 min-h-[40px] leading-relaxed">{account.description}</p>
                      
                      <button
                        onClick={() => handleConnect(account.platform)}
                        disabled={isBound || !account.isSupported}
                        className={`w-full rounded-lg h-10 font-medium transition-all ${
                          isBound
                            ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-50 cursor-default'
                            : !account.isSupported
                            ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                            : `bg-gradient-to-r ${account.bgColor} text-white hover:opacity-90 shadow-md hover:shadow-lg`
                        }`}
                      >
                        {isBound ? (
                          <span className="flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 mr-1.5" /> 已绑定
                          </span>
                        ) : !account.isSupported ? (
                          <span className="flex items-center justify-center">
                            <Clock className="w-4 h-4 mr-1.5" /> 敬请期待
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            <ExternalLink className="w-4 h-4 mr-1.5" /> 立即绑定
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 帮助与提示 - 双栏布局 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <h4 className="font-semibold text-blue-900 flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-blue-600" />
              快速指南
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start text-sm text-blue-800/80">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                <span>选择您想要分发视频的目标平台，点击&ldquo;立即绑定&rdquo;</span>
              </li>
              <li className="flex items-start text-sm text-blue-800/80">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                <span>按照弹窗指引完成扫码或授权登录（YouTube需科学上网）</span>
              </li>
              <li className="flex items-start text-sm text-blue-800/80">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                <span>绑定成功后，即可在视频列表页选择一键发布</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100">
            <h4 className="font-semibold text-amber-900 flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              注意事项
            </h4>
            <ul className="space-y-2.5">
              <li className="flex items-start text-sm text-amber-800/80">
                <span className="mr-2 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                <span>B站二维码有效期为5分钟，请尽快完成扫码</span>
              </li>
              <li className="flex items-start text-sm text-amber-800/80">
                <span className="mr-2 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                <span>YouTube授权仅请求必要的发布权限，保障账号安全</span>
              </li>
              <li className="flex items-start text-sm text-amber-800/80">
                <span className="mr-2 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                <span>不同平台的Cookie有效期不同，失效后需重新绑定</span>
              </li>
              <li className="flex items-start text-sm text-amber-800/80">
                <span className="mr-2 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                <span>解绑账号不会删除您的历史数据，可随时重新绑定</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
