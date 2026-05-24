'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('提交的表单数据:', formData);
    setSubmitted(true);
    
    // 重置表单
    setTimeout(() => {
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
      setSubmitted(false);
    }, 3000);
  };

  return (
    <div className="container py-5">
      <div className="row">
        <div className="col-lg-8 mx-auto">
          <h1 className="display-4 mb-4 text-center">联系我们</h1>
          <p className="lead text-center mb-5">
            如果您有任何问题或建议，请随时与我们联系
          </p>
          
          {submitted && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
              <strong>感谢您的消息！</strong> 我们已收到您的信息，会尽快回复您。
              <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
          )}
          
          <div className="card shadow-sm">
            <div className="card-body p-5">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="name" className="form-label fw-bold">姓名</label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="email" className="form-label fw-bold">邮箱</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label htmlFor="subject" className="form-label fw-bold">主题</label>
                  <input
                    type="text"
                    className="form-control"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="message" className="form-label fw-bold">消息</label>
                  <textarea
                    className="form-control"
                    id="message"
                    name="message"
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>
                <div className="d-grid">
                  <button type="submit" className="btn btn-primary btn-lg">
                    发送消息
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          <div className="row mt-5">
            <div className="col-md-4 text-center">
              <div className="mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-envelope text-primary" viewBox="0 0 16 16">
                  <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
                </svg>
              </div>
              <h5>邮箱</h5>
              <p className="text-muted">support@stockdashboard.com</p>
            </div>
            <div className="col-md-4 text-center">
              <div className="mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-geo-alt text-success" viewBox="0 0 16 16">
                  <path d="M12.166 8.94c-.524 1.062-1.234 2.12-2.564 2.44-1.17.293-2.052-.096-2.574-.869l-.047-.081c-.293-.565-.198-1.36.223-2.02.435-.676.935-1.16 1.405-1.685.092-.103.183-.21.273-.318.334-.393.67-.804 1.023-1.21a.98.98 0 0 1 1.384 0c.354.406.69.817 1.023 1.21.09.108.18.215.273.318.537.612.64 1.425.223 2.02-.422.597-.847 1.115-1.344 1.692m-6.616-3.334l1.01 2.02 2.02.002-1.01 2.02 1.415 1.414-2.02-1.01-2.02 1.01-1.415-1.414 1.01-2.02.002-2.02 2.02 1.01z"/>
                </svg>
              </div>
              <h5>地址</h5>
              <p className="text-muted">中国上海市浦东新区<br/>世纪大道1001号</p>
            </div>
            <div className="col-md-4 text-center">
              <div className="mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-clock text-warning" viewBox="0 0 16 16">
                  <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                </svg>
              </div>
              <h5>工作时间</h5>
              <p className="text-muted">周一至周五: 9:00 AM - 6:00 PM<br/>周末: 关闭</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}