import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="container py-5">
      <div className="row">
        <div className="col-12">
          <h1 className="display-4 mb-4">关于我们</h1>
          <p className="lead">
            股票数据实时可视化系统是一个直观、交互性强且个性化的股票数据可视化与模拟投资平台。
          </p>
          <p>
            我们的平台提供以下功能：
          </p>
          <ul className="list-group list-group-flush">
            <li className="list-group-item d-flex align-items-start">
              <div className="flex-shrink-0 me-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-graph-up text-success" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M0 0h1v15h15v1H0V0Zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07Z"/>
                </svg>
              </div>
              <div className="flex-grow-1">
                <h5 className="mt-0">实时股票数据</h5>
                <p className="mb-0">获取最新的股票价格和市场数据</p>
              </div>
            </li>
            <li className="list-group-item d-flex align-items-start">
              <div className="flex-shrink-0 me-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-bar-chart-line text-info" viewBox="0 0 16 16">
                  <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1V2zM6 4v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4h2zm2 5V4h2v5a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"/>
                </svg>
              </div>
              <div className="flex-grow-1">
                <h5 className="mt-0">交互式图表</h5>
                <p className="mb-0">通过交互式图表分析股票趋势</p>
              </div>
            </li>
            <li className="list-group-item d-flex align-items-start">
              <div className="flex-shrink-0 me-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-wallet2 text-warning" viewBox="0 0 16 16">
                  <path d="M12.136.326A1.5 1.5 0 0 1 14 1.78V3h.5A1.5 1.5 0 0 1 16 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 13.5v-9a1.5 1.5 0 0 1 1.432-1.499L12.136.326zM5.562 3H13V1.78a.5.5 0 0 0-.621-.484L5.562 3zM1.5 4a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z"/>
                </svg>
              </div>
              <div className="flex-grow-1">
                <h5 className="mt-0">投资组合管理</h5>
                <p className="mb-0">创建和管理多个投资组合</p>
              </div>
            </li>
            <li className="list-group-item d-flex align-items-start">
              <div className="flex-shrink-0 me-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-star text-primary" viewBox="0 0 16 16">
                  <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.39 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.5.5 0 0 0-.89.029l-4.898.696-3.522 3.356c-.442.062-.612.636-.283.95l.83 4.73zM8 12.027c.08 0 .16.016.23.044l4.217 2.108-1.46-4.055a.5.5 0 0 1 .22-.579l3.523-3.356-4.217-2.108a.5.5 0 0 1-.22-.579L11.5 2.929l-4.217 2.108a.5.5 0 0 1-.22.579l-3.523 3.356 1.46 4.055a.5.5 0 0 1 .22.579L8 12.027z"/>
                </svg>
              </div>
              <div className="flex-grow-1">
                <h5 className="mt-0">自选股跟踪</h5>
                <p className="mb-0">跟踪您关注的股票</p>
              </div>
            </li>
          </ul>
          <div className="mt-4">
            <Link href="/" className="btn btn-primary me-2">返回首页</Link>
            <Link href="/contact" className="btn btn-outline-secondary">联系我们</Link>
          </div>
        </div>
      </div>
    </div>
  );
}