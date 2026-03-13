'use client';

import { useSimpleAuth } from '@/components/SimpleAuthProvider';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useSimpleAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      // 如果用户未登录且不再加载中，则重定向到登录页面
      router.push('/');
    }
  }, [user, isLoading, router]);

  // 如果正在加载或用户已登录，则显示子组件
  if (isLoading || user) {
    return <>{children}</>;
  }

  // 否则返回空或加载指示器
  return null;
}