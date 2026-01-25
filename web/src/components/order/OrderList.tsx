'use client';

import { useState, useEffect } from 'react';
import { useFirebaseUserStore } from '@/store/firebaseUserStore';
import { firebaseUserApi } from '@/lib/firebaseApi';
import type { Order } from '@/types';
import { Clock, CheckCircle, XCircle, Package } from 'lucide-react';

export default function OrderList() {
  const { currentUser, firebaseUser } = useFirebaseUserStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser || firebaseUser) {
      fetchOrders();
    }
  }, [currentUser, firebaseUser]);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await firebaseUserApi.getUserOrders(20);
      if (response.code === 0) {
        setOrders(response.data || []);
      } else {
        setError(response.message || '获取订单列表失败');
      }
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(err.response?.data?.message || '获取订单列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        icon: Clock,
        label: '待支付',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
      },
      paid: {
        icon: CheckCircle,
        label: '已支付',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      },
      failed: {
        icon: XCircle,
        label: '支付失败',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      },
      cancelled: {
        icon: XCircle,
        label: '已取消',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
      },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getPayWayLabel = (payWay: string) => {
    const labels: Record<string, string> = {
      alipay: '支付宝',
      wechat: '微信支付',
      paypal: 'PayPal',
      mock: '模拟支付',
    };
    return labels[payWay] || payWay;
  };

  if (!currentUser && !firebaseUser) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">请先登录查看订单</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchOrders}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          重试
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">暂无订单</p>
        <a
          href="/vip"
          className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          去购买会员
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">我的订单</h2>
      
      {orders.map((order) => {
        const statusConfig = getStatusConfig(order.status);
        const StatusIcon = statusConfig.icon;

        return (
          <div
            key={order.order_no}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-1">
                  订单号：{order.order_no}
                </h3>
                <p className="text-sm text-gray-600">
                  创建时间：{formatDate(order.created_at)}
                </p>
              </div>
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusConfig.bgColor} border ${statusConfig.borderColor}`}
              >
                <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                <span className={`text-sm font-medium ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-sm text-gray-600 mb-1">订单金额</p>
                <p className="text-lg font-bold text-gray-900">
                  ¥{order.amount.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">支付方式</p>
                <p className="font-medium text-gray-900">
                  {getPayWayLabel(order.pay_way)}
                </p>
              </div>
              {order.paid_at && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 mb-1">支付时间</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(order.paid_at)}
                  </p>
                </div>
              )}
            </div>

            {order.status === 'pending' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                  继续支付
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
