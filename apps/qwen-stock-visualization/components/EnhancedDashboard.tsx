'use client';

import { useState, useEffect } from 'react';
import { useSimpleAuth } from '@/components/SimpleAuthProvider';
import { getAllStocks, getUserWatchlist, addToWatchlist, removeFromWatchlist, getUserPortfolios, createPortfolio, deletePortfolio, getPortfolioPositions, getPortfolioTransactions, executeTrade, getHistoricalPrices, getLatestPrice } from '@/lib/stockDataLayer';
import StockChart from '@/components/StockChart';

export default function EnhancedDashboard() {
  const { user, signOut } = useSimpleAuth();
  const [profile, setProfile] = useState<any>(null);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [tradeForm, setTradeForm] = useState({
    quantity: 1,
    price: 0, // 默认价格为0，稍后会根据选中的股票更新
    type: 'buy' as 'buy' | 'sell'
  });
  const [showTradePanel, setShowTradePanel] = useState(true); // 控制交易面板显示状态
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [initialBalance, setInitialBalance] = useState(100000);
  const [loading, setLoading] = useState(true);

  // 添加定时刷新功能
  useEffect(() => {
    if (user) {
      fetchData();

      // 设置定时器，每0.5秒刷新一次数据
      const interval = setInterval(() => {
        // 只刷新持仓数据和相关价格，避免刷新全部数据影响性能
        if (selectedPortfolio) {
          loadPortfolioData({}); // 正常刷新，不使用价格覆盖
        }
        if (selectedStock) {
          loadHistoricalData();
        }
      }, 500); // 每500毫秒（0.5秒）刷新一次

      // 清理定时器
      return () => clearInterval(interval);
    }
  }, [user]); // 只监听user，避免依赖数组长度变化

  useEffect(() => {
    if (selectedPortfolio) {
      loadPortfolioData();
    }
  }, [selectedPortfolio]);

  useEffect(() => {
    if (selectedStock) {
      loadHistoricalData();
      // 当选中股票时，获取最新价格并更新交易表单
      const fetchCurrentPrice = async () => {
        try {
          const latestPrice = await getLatestPrice(selectedStock.id, localStorage.getItem('auth_token'));
          if (latestPrice) {
            setTradeForm(prev => ({
              ...prev,
              price: parseFloat(latestPrice.price)
            }));
          }
        } catch (error) {
          console.error('Error fetching current price:', error);
        }
      };
      fetchCurrentPrice();
    }
  }, [selectedStock]);

  const fetchData = async () => {
    setLoading(true);

    try {
      // 设置用户资料为简单用户信息
      setProfile(user);

      // 获取所有数据
      await Promise.all([
        fetchWatchlist(),
        fetchStocks(),
        fetchPortfolios()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlist = async () => {
    try {
      // 使用简单用户ID和访问令牌获取自选股
      const watchlistData = await getUserWatchlist(user?.id, localStorage.getItem('auth_token'));
      setWatchlist(watchlistData);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    }
  };

  const fetchStocks = async () => {
    try {
      // 使用访问令牌获取股票数据
      const stocksData = await getAllStocks(localStorage.getItem('auth_token'));
      setStocks(stocksData);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    }
  };

  const fetchPortfolios = async () => {
    try {
      // 使用简单用户ID和访问令牌获取投资组合
      const portfoliosData = await getUserPortfolios(user?.id, localStorage.getItem('auth_token'));

      // 为每个投资组合获取持仓数据并计算总价值
      const portfoliosWithReturns = await Promise.all(portfoliosData.map(async (portfolio) => {
        // 获取该投资组合的持仓
        const portfolioPositions = await getPortfolioPositions(portfolio.id, localStorage.getItem('auth_token'));

        // 获取每个持仓的最新价格并计算总市值
        let holdingsValue = 0;
        for (const position of portfolioPositions) {
          try {
            const latestPrice = await getLatestPrice(position.stock_id, localStorage.getItem('auth_token'));
            if (latestPrice) {
              holdingsValue += position.quantity * parseFloat(latestPrice.price);
            }
          } catch (error) {
            console.warn(`无法获取股票 ${position.stock_id} 的最新价格:`, error);
            // 如果无法获取最新价格，使用平均成本作为当前价格
            holdingsValue += position.quantity * position.avg_cost;
          }
        }

        // 计算总资产和收益率
        const totalAssets = portfolio.current_balance + holdingsValue;
        const totalProfitLoss = totalAssets - portfolio.initial_balance;
        const returnRate = portfolio.initial_balance ?
          (totalProfitLoss / portfolio.initial_balance) * 100 : 0;

        return {
          ...portfolio,
          holdings_value: holdingsValue,
          total_assets: totalAssets,
          return_rate: returnRate
        };
      }));

      setPortfolios(portfoliosWithReturns);

      // 设置默认选择第一个投资组合
      if (portfoliosWithReturns.length > 0 && !selectedPortfolio) {
        setSelectedPortfolio(portfoliosWithReturns[0]);
      }
    } catch (error) {
      console.error('Error fetching portfolios:', error);
    }
  };

  const loadPortfolioData = async (priceOverrides = {}) => {
    if (!selectedPortfolio) return;

    try {
      const [positionsData, transactionsData] = await Promise.all([
        getPortfolioPositions(selectedPortfolio.id, localStorage.getItem('auth_token')),
        getPortfolioTransactions(selectedPortfolio.id, localStorage.getItem('auth_token'))
      ]);

      // 对于每个持仓股票，获取其最新价格
      const positionsWithPrices = await Promise.all(
        positionsData.map(async (position) => {
          try {
            // 检查是否有价格覆盖（用于交易后立即显示，避免价格波动影响）
            if (priceOverrides[position.stock_id]) {
              return {
                ...position,
                latest_price: priceOverrides[position.stock_id]
              };
            }

            const latestPrice = await getLatestPrice(position.stock_id, localStorage.getItem('auth_token'));
            if (latestPrice) {
              // 将最新价格添加到持仓数据中
              return {
                ...position,
                latest_price: parseFloat(latestPrice.price)
              };
            }
          } catch (error) {
            console.warn(`无法获取股票 ${position.stock_id} 的最新价格:`, error);
          }
          // 如果无法获取最新价格，使用平均成本作为当前价格
          return {
            ...position,
            latest_price: position.avg_cost
          };
        })
      );

      setPositions(positionsWithPrices);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading portfolio data:', error);
    }
  };

  const loadHistoricalData = async () => {
    if (!selectedStock) return;

    try {
      // 使用访问令牌获取历史价格数据
      const data = await getHistoricalPrices(selectedStock.id, 30, localStorage.getItem('auth_token')); // 最近30天数据

      // 格式化数据以适应图表
      const formattedData = data.map((item: any) => ({
        timestamp: item.timestamp,
        price: parseFloat(item.price),
        volume: item.volume || 0
      }));

      setHistoricalData(formattedData);
    } catch (error) {
      console.error('Error loading historical data:', error);
    }
  };

  const handleAddToWatchlist = async (stockId: number) => {
    try {
      // 使用简单用户ID和访问令牌添加到自选股
      const success = await addToWatchlist(user?.id, stockId, localStorage.getItem('auth_token'));
      if (success) {
        fetchWatchlist(); // 刷新自选股
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error);
    }
  };

  const handleRemoveFromWatchlist = async (watchlistId: number) => {
    try {
      // 使用访问令牌从自选股移除
      const success = await removeFromWatchlist(watchlistId, localStorage.getItem('auth_token'));
      if (success) {
        fetchWatchlist(); // 刷新自选股
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  const handleCreatePortfolio = async () => {
    if (!newPortfolioName.trim()) return;

    try {
      // 使用简单用户ID和访问令牌创建投资组合
      const newPortfolio = await createPortfolio(user?.id, newPortfolioName, initialBalance, localStorage.getItem('auth_token'));
      if (newPortfolio) {
        setPortfolios([...portfolios, newPortfolio]);
        setSelectedPortfolio(newPortfolio);
        setNewPortfolioName('');
        setInitialBalance(100000);
      }
    } catch (error) {
      console.error('Error creating portfolio:', error);
    }
  };

  const handleDeletePortfolio = async (portfolioId: number) => {
    if (!window.confirm('确定要删除这个投资组合吗？此操作不可撤销，将同时删除所有相关持仓和交易记录。')) {
      return;
    }

    try {
      // 使用访问令牌删除投资组合
      const success = await deletePortfolio(portfolioId, localStorage.getItem('auth_token'));

      if (success) {
        // 从状态中移除已删除的投资组合
        const updatedPortfolios = portfolios.filter(portfolio => portfolio.id !== portfolioId);
        setPortfolios(updatedPortfolios);

        // 如果删除的是当前选中的投资组合，则选择第一个投资组合或设为null
        if (selectedPortfolio?.id === portfolioId) {
          setSelectedPortfolio(updatedPortfolios.length > 0 ? updatedPortfolios[0] : null);
        }

        console.log('投资组合删除成功');
      }
    } catch (error) {
      console.error('删除投资组合时出错:', error);
      alert('删除投资组合失败，请重试。');
    }
  };

  const toggleTradePanel = () => {
    setShowTradePanel(!showTradePanel);
  };

  const handleExecuteTrade = async () => {
    if (!selectedPortfolio || !selectedStock || tradeForm.quantity <= 0 || tradeForm.price <= 0) {
      alert('请填写正确的交易信息：数量和价格必须大于0');
      return;
    }

    // 如果是卖出操作，检查用户是否有足够的持仓
    if (tradeForm.type === 'sell') {
      const currentHoldings = positions.find(pos => pos.stock_id === selectedStock.id);
      if (!currentHoldings || currentHoldings.quantity < tradeForm.quantity) {
        alert(`卖出失败：您没有足够的 ${selectedStock.symbol} 股票。当前持仓: ${currentHoldings ? currentHoldings.quantity : 0} 股`);
        return;
      }
    }

    try {
      // 使用访问令牌执行交易
      const tradeResult = await executeTrade(
        selectedPortfolio.id,
        selectedStock.id,
        tradeForm.type,
        tradeForm.quantity,
        tradeForm.price,
        localStorage.getItem('auth_token')
      );

      // 交易完成后，刷新整个页面以确保数据完全同步
      window.location.reload();

      // 重置表单，但保留当前市场价格
      // 使用最新的历史数据中的价格作为当前市场价格
      const currentPrice = historicalData.length > 0
        ? parseFloat(historicalData[historicalData.length - 1].price)
        : 0;
      setTradeForm({
        quantity: 1,
        price: currentPrice,
        type: 'buy'
      });
    } catch (error) {
      console.error('Error executing trade:', error);
      alert(`交易失败: ${error}`);
    }
  };

  if (!user) {
    return (
      <div className="container-fluid">
        <div className="row justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
          <div className="col-md-6 text-center">
            <p className="lead text-muted">请先登录</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* 注意：欢迎信息现在在顶部的Navbar中显示，此处不再重复 */}

      <div className="row">
        {/* 左侧栏 - 自选股和投资组合管理 */}
        <div className="col-lg-3">
          <div className="mb-4">
            {/* 自选股 */}
            <div className="card shadow-sm">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">我的自选股</h5>
                <div className="bg-primary bg-opacity-10 p-2 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.206-2.03zM4 3a2 2 0 104 0 2 2 0 00-4 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="d-flex justify-content-center align-items-center" style={{ height: '120px' }}>
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : watchlist.length === 0 ? (
                  <div className="text-center py-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '48px', height: '48px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <p className="mt-2 text-muted">暂无自选股</p>
                  </div>
                ) : (
                  <ul className="list-group list-group-flush max-height-300 overflow-auto">
                    {watchlist.map((item) => (
                      <li
                        key={item.id}
                        className={`list-group-item d-flex justify-content-between align-items-center cursor-pointer ${
                          selectedStock?.id === item.stocks.id ? 'bg-primary bg-opacity-10' : 'hover-bg-light'
                        }`}
                        onClick={() => setSelectedStock(item.stocks)}
                      >
                        <div>
                          <h6 className="mb-0">{item.stocks.symbol}</h6>
                          <small className="text-muted">{item.stocks.name}</small>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromWatchlist(item.id);
                          }}
                          className="btn btn-sm btn-outline-danger"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div>
            {/* 投资组合管理 */}
            <div className="card shadow-sm">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">我的投资组合</h5>
                <div className="bg-success bg-opacity-10 p-2 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-success" viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* 创建新投资组合 */}
              <div className="card-body border-bottom">
                <h6 className="card-title">创建新投资组合</h6>
                <div className="mb-3">
                  <input
                    type="text"
                    value={newPortfolioName}
                    onChange={(e) => setNewPortfolioName(e.target.value)}
                    placeholder="投资组合名称"
                    className="form-control"
                  />
                </div>
                <div className="mb-3">
                  <input
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(Number(e.target.value))}
                    placeholder="初始资金"
                    className="form-control"
                  />
                </div>
                <button
                  onClick={handleCreatePortfolio}
                  className="btn btn-primary w-100"
                >
                  创建投资组合
                </button>
              </div>

              {/* 投资组合列表 */}
              <div className="card-body">
                <h6 className="card-title">现有投资组合</h6>
                <div className="list-group">
                  {portfolios.map((portfolio) => (
                    <div
                      key={portfolio.id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <div
                        className="flex-grow-1 cursor-pointer"
                        onClick={() => setSelectedPortfolio(portfolio)}
                      >
                        <div className="fw-bold">{portfolio.name}</div>
                        <small className="text-muted">${portfolio.current_balance != null ? portfolio.current_balance.toFixed(2) : '0.00'}</small>
                      </div>
                      <div className="d-flex align-items-center">
                        <div className="text-end me-3">
                          <div className="fw-bold">${portfolio.current_balance != null ? portfolio.current_balance.toFixed(2) : '0.00'}</div>
                          <small className={portfolio.return_rate != null && portfolio.return_rate >= 0 ? 'text-success' : 'text-danger'}>
                            {`${portfolio.return_rate != null ? portfolio.return_rate.toFixed(2) : '0.00'}%`}
                          </small>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePortfolio(portfolio.id);
                          }}
                          className="btn btn-sm btn-outline-danger"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧栏 - 图表和交易面板 */}
        <div className="col-lg-9">
          {/* 股票图表 */}
          {selectedStock && historicalData.length > 0 && (
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <StockChart
                  data={historicalData}
                  title={`${selectedStock.symbol} - ${selectedStock.name} 价格走势`}
                  type="area"
                />
              </div>
            </div>
          )}

          {/* 交易面板 */}
          {selectedPortfolio && selectedStock && showTradePanel && (
            <div className="card shadow-sm mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  交易 - {selectedStock.symbol} ({selectedStock.name})
                </h5>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={toggleTradePanel}
                  title="收起交易面板"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="card-body">
                <div className="row">
                  {/* 交易表单 */}
                  <div className="col-md-6">
                    <h6 className="mb-3 d-flex align-items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2 text-primary" viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      执行交易
                    </h6>
                    <div className="mb-3">
                      <label className="form-label fw-medium">交易类型</label>
                      <div>
                        <div className="form-check form-check-inline">
                          <input
                            className="form-check-input"
                            type="radio"
                            checked={tradeForm.type === 'buy'}
                            onChange={() => setTradeForm({...tradeForm, type: 'buy'})}
                          />
                          <label className="form-check-label text-success fw-bold">买入</label>
                        </div>
                        <div className="form-check form-check-inline">
                          <input
                            className="form-check-input"
                            type="radio"
                            checked={tradeForm.type === 'sell'}
                            onChange={() => setTradeForm({...tradeForm, type: 'sell'})}
                          />
                          <label className="form-check-label text-danger fw-bold">卖出</label>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-medium">数量</label>
                      <input
                        type="number"
                        value={tradeForm.quantity}
                        onChange={(e) => setTradeForm({...tradeForm, quantity: parseInt(e.target.value) || 0})}
                        min="1"
                        className="form-control"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-medium">价格 (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={tradeForm.price}
                        onChange={(e) => setTradeForm({...tradeForm, price: parseFloat(e.target.value) || 0})}
                        className="form-control"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-medium">总金额</label>
                      <div className="form-control bg-light" aria-readonly="true">
                        ${(tradeForm.quantity * tradeForm.price).toFixed(2)}
                      </div>
                    </div>

                    <button
                      onClick={handleExecuteTrade}
                      className={`btn w-100 fw-bold ${
                        tradeForm.type === 'buy'
                          ? 'btn-success'
                          : 'btn-danger'
                      }`}
                    >
                      {tradeForm.type === 'buy' ? '买入' : '卖出'} {selectedStock.symbol}
                    </button>
                  </div>

                  {/* 当前持仓 */}
                  <div className="col-md-6">
                    <h6 className="mb-3 d-flex align-items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2 text-primary" viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                      当前持仓
                    </h6>
                    {positions.length > 0 ? (
                      <div>
                        {positions
                          .filter(pos => pos.stock_id === selectedStock.id)
                          .map((position) => {
                            const currentPrice = position.latest_price;
                            const currentValue = position.quantity * currentPrice;
                            const costValue = position.quantity * position.avg_cost;
                            const profitLoss = currentValue - costValue;
                            const profitLossPercentage = costValue !== 0 ? (profitLoss / costValue) * 100 : 0;

                            return (
                              <div key={position.id} className="border rounded p-3 mb-3">
                                <div className="row">
                                  <div className="col-6">
                                    <div className="text-muted">数量:</div>
                                    <div className="fw-bold">{position.quantity}</div>
                                  </div>
                                  <div className="col-6">
                                    <div className="text-muted">平均成本:</div>
                                    <div className="fw-bold">${position.avg_cost != null ? position.avg_cost.toFixed(2) : '0.00'}</div>
                                  </div>
                                  <div className="col-6">
                                    <div className="text-muted">当前价值:</div>
                                    <div className="fw-bold">${currentValue != null ? currentValue.toFixed(2) : '0.00'}</div>
                                  </div>
                                  <div className="col-6">
                                    <div className="text-muted">盈亏:</div>
                                    <div className={`fw-bold ${
                                      profitLoss != null && profitLoss >= 0 ? 'text-success' : 'text-danger'
                                    }`}>
                                      ${profitLoss != null ? profitLoss.toFixed(2) : '0.00'} (${profitLossPercentage != null ? profitLossPercentage.toFixed(2) : '0.00'}%)
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '40px', height: '40px' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="mt-2">暂无持仓</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {!showTradePanel && selectedPortfolio && selectedStock && (
            <div className="card shadow-sm mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  交易 - {selectedStock.symbol} ({selectedStock.name})
                </h5>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={toggleTradePanel}
                  title="展开交易面板"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* 持仓汇总 */}
          {selectedPortfolio && (
            <div className="card shadow-sm">
              <div className="card-header d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 me-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h5 className="card-title mb-0">持仓汇总 - {selectedPortfolio.name}</h5>
              </div>
              <div className="card-body">
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card bg-success bg-opacity-10 border-0">
                      <div className="card-body text-center">
                        <p className="card-text text-muted">初始资金</p>
                        <p className="card-title fw-bold fs-4">${selectedPortfolio.initial_balance != null ? selectedPortfolio.initial_balance.toFixed(2) : '0.00'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-primary bg-opacity-10 border-0">
                      <div className="card-body text-center">
                        <p className="card-text text-muted">投资组合余额</p>
                        <p className="card-title fw-bold fs-4">${selectedPortfolio.current_balance != null ? selectedPortfolio.current_balance.toFixed(2) : '0.00'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-info bg-opacity-10 border-0">
                      <div className="card-body text-center">
                        <p className="card-text text-muted">持仓总额</p>
                        <p className="card-title fw-bold fs-4">
                          ${positions.reduce((sum, position) => {
                            return sum + (position.quantity * (position.latest_price != null ? position.latest_price : 0));
                          }, 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card bg-warning bg-opacity-10 border-0">
                      <div className="card-body text-center">
                        <p className="card-text text-muted">总盈亏</p>
                        {(() => {
                          // 计算各项指标
                          const initialBalance = selectedPortfolio.initial_balance; // 初始资金
                          const currentBalance = selectedPortfolio.current_balance; // 投资组合余额
                          const holdingsValue = positions.reduce((sum, position) => { // 持仓总额
                            return sum + (position.quantity * position.latest_price);
                          }, 0);

                          // 总盈亏 = 投资组合余额 + 持仓总额 - 初始资金
                          const totalProfitLoss = currentBalance + holdingsValue - initialBalance;

                          return (
                            <p className={`card-title fw-bold fs-4 ${
                              totalProfitLoss >= 0
                                ? 'text-success'
                                : 'text-danger'
                            }`}>
                              ${totalProfitLoss != null ? totalProfitLoss.toFixed(2) : '0.00'}
                              <br />
                              <small>
                                ({totalProfitLoss != null && initialBalance != null ? (((totalProfitLoss / initialBalance) * 100).toFixed(2)) : '0.00'}%)
                              </small>
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                <h6 className="mb-3">详细持仓</h6>
                {positions.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>股票</th>
                          <th>数量</th>
                          <th>平均成本</th>
                          <th>当前价格</th>
                          <th>当前价值</th>
                          <th>盈亏</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map((position) => {
                          const currentPrice = position.latest_price;
                          const currentValue = position.quantity * currentPrice;
                          const costValue = position.quantity * position.avg_cost;
                          const profitLoss = currentValue - costValue;
                          const profitLossPercentage = costValue !== 0 ? (profitLoss / costValue) * 100 : 0;

                          return (
                            <tr key={position.id}>
                              <td>
                                <div className="fw-bold">{position.stocks.symbol}</div>
                                <small className="text-muted">{position.stocks.name}</small>
                              </td>
                              <td className="fw-medium">{position.quantity}</td>
                              <td>${position.avg_cost != null ? position.avg_cost.toFixed(2) : '0.00'}</td>
                              <td>
                                ${currentPrice != null ? currentPrice.toFixed(2) : '0.00'}
                              </td>
                              <td className="fw-medium">${currentValue != null ? currentValue.toFixed(2) : '0.00'}</td>
                              <td className={`fw-bold ${
                                profitLoss != null && profitLoss >= 0 ? 'text-success' : 'text-danger'
                              }`}>
                                ${profitLoss != null ? profitLoss.toFixed(2) : '0.00'}<br />
                                <small>(${profitLossPercentage != null ? profitLossPercentage.toFixed(2) : '0.00'}%)</small>
                              </td>
                              <td>
                                <div className="btn-group btn-group-sm" role="group">
                                  <button
                                    type="button"
                                    className="btn btn-outline-success"
                                    onClick={() => {
                                      setSelectedStock(position.stocks);
                                      setTradeForm({
                                        quantity: 1,
                                        price: currentPrice || position.avg_cost,
                                        type: 'buy'
                                      });
                                    }}
                                  >
                                    买入
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() => {
                                      setSelectedStock(position.stocks);
                                      setTradeForm({
                                        quantity: 1, // 默认为1股，用户可以修改
                                        price: currentPrice || position.avg_cost,
                                        type: 'sell'
                                      });
                                    }}
                                  >
                                    卖出
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '48px', height: '48px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="mt-2">暂无持仓记录</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}