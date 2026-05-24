import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-lg">
            <div className="card-header text-center py-4">
              <h3 className="mb-0">登录到您的账户</h3>
            </div>
            <div className="card-body p-5">
              <form>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">邮箱地址</label>
                  <input 
                    type="email" 
                    className="form-control form-control-lg" 
                    id="email" 
                    placeholder="输入您的邮箱地址" 
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="password" className="form-label">密码</label>
                  <input 
                    type="password" 
                    className="form-control form-control-lg" 
                    id="password" 
                    placeholder="输入您的密码" 
                  />
                </div>
                <div className="d-grid mb-3">
                  <button type="submit" className="btn btn-primary btn-lg">登录</button>
                </div>
                <div className="text-center">
                  <p className="mb-0">
                    还没有账户？ <Link href="/signup" className="text-decoration-none">立即注册</Link>
                  </p>
                  <p className="mb-0 mt-2">
                    <Link href="#" className="text-decoration-none">忘记密码？</Link>
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