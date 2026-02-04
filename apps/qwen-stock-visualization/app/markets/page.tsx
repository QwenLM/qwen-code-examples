'use client';

import { useState, useEffect } from 'react';
import { useSimpleAuth } from '@/components/SimpleAuthProvider';
import { getAllStocks, getLatestPrice, getUserWatchlist } from '@/lib/stockDataLayer';
import AddToWatchlistButton from '@/components/AddToWatchlistButton';

export default function MarketsPage() {
  const { user } = useSimpleAuth();
  const [marketData, setMarketData] = useState<any[]>([]);
  const [watchlistStockIds, setWatchlistStockIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        // 获取所有股票 - 使用匿名令牌也可以获取公开的股票信息
        const stocks = await getAllStocks();

        // 获取每只股票的最新价格
        const stocksWithLatestPrices = await Promise.all(
          stocks.map(async (stock: any) => {
            const latestPrice = await getLatestPrice(stock.id);
            return {
              ...stock,
              latestPrice: latestPrice || null
            };
          })
        );

        setMarketData(stocksWithLatestPrices);
      } catch (error) {
        console.error('Error fetching market data:', error);
      } finally {
        setLoading(false);
      }
    };

    // 首次加载数据
    fetchMarketData();

    // 设置定时器，每0.5秒刷新一次市场数据
    const interval = setInterval(fetchMarketData, 500);

    // 清理定时器
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // 获取用户的自选股列表
    const fetchWatchlist = async () => {
      if (user) {
        try {
          const watchlist = await getUserWatchlist(user.id, localStorage.getItem('auth_token'));
          const stockIds = watchlist.map((item: any) => item.stock_id);
          setWatchlistStockIds(stockIds);
        } catch (error) {
          console.error('Error fetching watchlist:', error);
        }
      }
    };

    fetchWatchlist();
  }, [user]);

  const handleWatchlistAdded = () => {
    // 重新获取自选股列表以更新状态
    if (user) {
      getUserWatchlist(user.id, localStorage.getItem('auth_token'))
        .then(watchlist => {
          const stockIds = watchlist.map((item: any) => item.stock_id);
          setWatchlistStockIds(stockIds);
        })
        .catch(error => {
          console.error('Error updating watchlist after add:', error);
        });
    }
  };

  const handleWatchlistRemoved = () => {
    // 重新获取自选股列表以更新状态
    if (user) {
      getUserWatchlist(user.id, localStorage.getItem('auth_token'))
        .then(watchlist => {
          const stockIds = watchlist.map((item: any) => item.stock_id);
          setWatchlistStockIds(stockIds);
        })
        .catch(error => {
          console.error('Error updating watchlist after remove:', error);
        });
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h3 mb-4">市场数据 - 实时股票价格</h1>

          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : marketData.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">暂无市场数据</p>
            </div>
          ) : (
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>股票代码</th>
                        <th>公司名称</th>
                        <th>最新价格</th>
                        <th>涨跌额</th>
                        <th>涨跌幅</th>
                        <th>交易所</th>
                        <th>时间</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketData.map((stock: any) => {
                        const isInWatchlist = watchlistStockIds.includes(stock.id);
                        return (
                          <tr key={stock.id}>
                            <td className="fw-bold">{stock.symbol}</td>
                            <td>{stock.name}</td>
                            <td>
                              {stock.latestPrice
                                ? `$${parseFloat(stock.latestPrice.price).toFixed(2)}`
                                : 'N/A'}
                            </td>
                            <td className={stock.latestPrice && stock.latestPrice.change_amount >= 0 ? 'text-success' : 'text-danger'}>
                              {stock.latestPrice
                                ? `${stock.latestPrice.change_amount >= 0 ? '+' : ''}${parseFloat(stock.latestPrice.change_amount).toFixed(2)}`
                                : 'N/A'}
                            </td>
                            <td className={stock.latestPrice && stock.latestPrice.change_percent >= 0 ? 'text-success' : 'text-danger'}>
                              {stock.latestPrice
                                ? `${stock.latestPrice.change_percent >= 0 ? '+' : ''}${parseFloat(stock.latestPrice.change_percent).toFixed(2)}%`
                                : 'N/A'}
                            </td>
                            <td>{stock.exchange}</td>
                            <td>
                              {stock.latestPrice
                                ? new Date(stock.latestPrice.timestamp).toLocaleString('zh-CN')
                                : 'N/A'}
                            </td>
                            <td>
                              {user ? (
                                <AddToWatchlistButton
                                  userId={user.id}
                                  stockId={stock.id}
                                  isInWatchlist={isInWatchlist}
                                  onAdded={handleWatchlistAdded}
                                  onRemoved={handleWatchlistRemoved}
                                />
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}