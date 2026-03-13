'use client';

import { useState } from 'react';
import { useSimpleAuth } from '@/components/SimpleAuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SimpleAuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { signIn, signUp } = useSimpleAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await signIn(email, password);
      } else {
        result = await signUp(email, password, nickname);
      }

      // 检查登录或注册是否成功
      if (result && result.success !== false) {
        // 使用 router.replace 替代 window.location.href
        router.replace('/');
      } else {
        alert(result?.error || '登录或注册失败');
      }
    } catch (error: any) {
      alert(error.message || error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="col-md-6 col-lg-5">
        <div className="card shadow-lg">
          <div className="card-body p-5">
            <div className="text-center mb-4">
              <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto" style={{ width: '64px', height: '64px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '32px', height: '32px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.07-.021A10.01 10.01 0 0117.25 19.5m-1.292-1.038a10.01 10.01 0 01-1.292-3.44m-3.44-3.44a10.01 10.01 0 01-3.44-3.44m3.44 3.44L9.75 9.75" />
                </svg>
              </div>
              <h2 className="mt-3 fw-bold">
                {isLogin ? '欢迎回来' : '创建账户'}
              </h2>
              <p className="text-muted">
                {isLogin ? '请输入您的凭据以继续' : '开始您的个性化股票分析之旅'}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="mb-3">
                  <label htmlFor="nickname" className="form-label fw-medium">
                    昵称
                  </label>
                  <input
                    id="nickname"
                    name="nickname"
                    type="text"
                    autoComplete="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="form-control form-control-lg"
                    placeholder="输入您的昵称"
                  />
                </div>
              )}

              <div className="mb-3">
                <label htmlFor="email-address" className="form-label fw-medium">
                  邮箱地址
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control form-control-lg"
                  placeholder="输入您的邮箱地址"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="password" className="form-label fw-medium">
                  密码
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-control form-control-lg"
                  placeholder="输入您的密码"
                />
              </div>

              <div className="d-flex justify-content-between align-items-center mb-3">
                {isLogin && (
                  <a href="#" className="text-decoration-none">
                    <small className="text-primary">忘记密码？</small>
                  </a>
                )}
              </div>

              <div className="d-grid mb-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-lg fw-medium"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      处理中...
                    </>
                  ) : (
                    isLogin ? '登录' : '注册'
                  )}
                </button>
              </div>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="btn btn-link text-decoration-none text-primary fw-medium"
              >
                {isLogin ? '没有账户？立即注册' : '已有账户？立即登录'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}