import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-lg">
            <div className="card-header text-center py-4">
              <h3 className="mb-0">创建新账户</h3>
            </div>
            <div className="card-body p-5">
              <form>
                <div className="mb-3">
                  <label htmlFor="fullname" className="form-label">全名</label>
                  <input 
                    type="text" 
                    className="form-control form-control-lg" 
                    id="fullname" 
                    placeholder="输入您的全名" 
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">邮箱地址</label>
                  <input 
                    type="email" 
                    className="form-control form-control-lg" 
                    id="email" 
                    placeholder="输入您的邮箱地址" 
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">密码</label>
                  <input 
                    type="password" 
                    className="form-control form-control-lg" 
                    id="password" 
                    placeholder="输入您的密码" 
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="confirmPassword" className="form-label">确认密码</label>
                  <input 
                    type="password" 
                    className="form-control form-control-lg" 
                    id="confirmPassword" 
                    placeholder="再次输入密码" 
                  />
                </div>
                <div className="form-check mb-4">
                  <input 
                    type="checkbox" 
                    className="form-check-input" 
                    id="termsCheck" 
                  />
                  <label className="form-check-label" htmlFor="termsCheck">
                    我同意 <Link href="/terms" className="text-decoration-none">服务条款</Link> 和 <Link href="/privacy" className="text-decoration-none">隐私政策</Link>
                  </label>
                </div>
                <div className="d-grid mb-3">
                  <button type="submit" className="btn btn-success btn-lg">注册</button>
                </div>
                <div className="text-center">
                  <p className="mb-0">
                    已有账户？ <Link href="/login" className="text-decoration-none">立即登录</Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}