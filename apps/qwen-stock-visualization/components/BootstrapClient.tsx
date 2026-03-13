'use client';

import { useEffect } from 'react';

export default function BootstrapClient() {
  useEffect(() => {
    // 动态导入Bootstrap JS以避免服务端渲染错误
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  return null;
}