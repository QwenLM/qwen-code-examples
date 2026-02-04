// lib/stockDataLayer.ts
import { createClient } from '@/lib/supabaseClient';

// 所有函数现在接受一个可选的访问令牌参数
const getSupabaseInstance = (accessToken?: string) => createClient(accessToken);

// 获取所有股票信息
export const getAllStocks = async (accessToken?: string) => {
  const supabase = getSupabaseInstance(accessToken);
  const { data, error } = await supabase
    .from('stocks')
    .select('*')
    .order('symbol');

  if (error) {
    console.error('Error fetching stocks:', error);
    return [];
  }

  return data;
};

// 获取特定股票的最新价格
export const getLatestPrice = async (stockId: number, accessToken?: string) => {
  const supabase = getSupabaseInstance(accessToken);
  const { data, error } = await supabase
    .from('stock_prices')
    .select('*')
    .eq('stock_id', stockId)
    .order('timestamp', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching latest price:', error);
    return null;
  }

  return data?.[0] || null;
};

// 获取特定股票的历史价格数据
export const getHistoricalPrices = async (stockId: number, days = 30, accessToken?: string) => {
  const supabase = getSupabaseInstance(accessToken);
  const { data, error } = await supabase
    .from('stock_prices')
    .select('*')
    .eq('stock_id', stockId)
    .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching historical prices:', error);
    return [];
  }

  return data;
};

// 获取用户的自选股
export const getUserWatchlist = async (userId: number, accessToken?: string) => {
  const supabase = getSupabaseInstance(accessToken);
  const { data, error } = await supabase
    .from('watchlists')
    .select(`
      *,
      stocks (*)
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching watchlist:', error);
    return [];
  }

  return data;
};

// 将股票添加到自选股
export const addToWatchlist = async (userId: number, stockId: number, accessToken?: string) => {
  const supabase = getSupabaseInstance(accessToken);
  const { error } = await supabase
    .from('watchlists')
    .insert([{ user_id: userId, stock_id: stockId }]);

  if (error) {
    console.error('Error adding to watchlist:', error);
    return false;
  }

  return true;
};

// 从自选股移除股票
export const removeFromWatchlist = async (watchlistId: number, accessToken?: string) => {
  const supabase = getSupabaseInstance(accessToken);
  const { error } = await supabase
    .from('watchlists')
    .delete()
    .eq('id', watchlistId);

  if (error) {
    console.error('Error removing from watchlist:', error);
    return false;
  }

  return true;
};

// 获取用户的所有投资组合
export const getUserPortfolios = async (userId: number, accessToken?: string) => {
  const supabase = getSupabaseInstance(accessToken);
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching portfolios:', error);
    return [];
  }

  return data;
};

// 创建新的投资组合
export const createPortfolio = async (userId: number, name: string, initialBalance: number, accessToken?: string) => {
  const supabase = getSupabaseInstance(accessToken);
  const { data, error } = await supabase
    .from('portfolios')
    .insert([{ user_id: userId, name, initial_balance: initialBalance, current_balance: initialBalance }])
    .select();

  if (error) {
    console.error('Error creating portfolio:', error);
    return null;
  }

  return data?.[0];
};

// 获取投资组合的持仓
export const getPortfolioPositions = async (portfolioId: number, accessToken?: string) => {
  const supabase = getSupabaseInstance(accessToken);
  const { data, error } = await supabase
    .from('portfolio_positions')
    .select(`
      *,
      stocks (*)
    `)
    .eq('portfolio_id', portfolioId);

  if (error) {
    console.error('Error fetching portfolio positions:', error);
    return [];
  }

  return data;
};

// 获取投资组合的交易记录
export const getPortfolioTransactions = async (portfolioId: number, accessToken?: string) => {
  const supabase = getSupabaseInstance(accessToken);
  const { data, error } = await supabase
    .from('portfolio_transactions')
    .select(`
      *,
      stocks (symbol, name)
    `)
    .eq('portfolio_id', portfolioId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching portfolio transactions:', error);
    return [];
  }

  return data;
};

// 删除投资组合
export const deletePortfolio = async (portfolioId: number, accessToken?: string) => {
  const supabase = getSupabaseInstance(accessToken);

  // 首先删除相关的持仓记录
  const { error: positionsError } = await supabase
    .from('portfolio_positions')
    .delete()
    .eq('portfolio_id', portfolioId);

  if (positionsError) {
    console.error('Error deleting portfolio positions:', positionsError);
    throw positionsError;
  }

  // 然后删除相关的交易记录
  const { error: transactionsError } = await supabase
    .from('portfolio_transactions')
    .delete()
    .eq('portfolio_id', portfolioId);

  if (transactionsError) {
    console.error('Error deleting portfolio transactions:', transactionsError);
    throw transactionsError;
  }

  // 最后删除投资组合本身
  const { error: portfolioError } = await supabase
    .from('portfolios')
    .delete()
    .eq('id', portfolioId);

  if (portfolioError) {
    console.error('Error deleting portfolio:', portfolioError);
    throw portfolioError;
  }

  return true;
};

// 执行交易（买入/卖出）
export const executeTrade = async (
  portfolioId: number,
  stockId: number,
  transactionType: 'buy' | 'sell',
  quantity: number,
  price: number,
  accessToken?: string
) => {
  const supabase = getSupabaseInstance(accessToken);

  // 计算总价值
  const totalValue = quantity * price;

  // 获取当前余额
  const { data: portfolioData, error: portfolioError } = await supabase
    .from('portfolios')
    .select('current_balance, initial_balance')
    .eq('id', portfolioId)
    .single();

  if (portfolioError) throw portfolioError;

  // 检查余额是否足够（仅对买入操作）
  if (transactionType === 'buy' && portfolioData.current_balance < totalValue) {
    throw new Error('Insufficient balance');
  }

  // 更新投资组合余额
  const newBalance = transactionType === 'buy'
    ? portfolioData.current_balance - totalValue
    : portfolioData.current_balance + totalValue;

  const { error: updateBalanceError } = await supabase
    .from('portfolios')
    .update({ current_balance: newBalance })
    .eq('id', portfolioId);

  if (updateBalanceError) throw updateBalanceError;

  // 记录交易
  const { data: transactionData, error: transactionError } = await supabase
    .from('portfolio_transactions')
    .insert([{
      portfolio_id: portfolioId,
      stock_id: stockId,
      transaction_type: transactionType,
      quantity,
      price,
      total_value: totalValue
    }])
    .select()
    .single();

  if (transactionError) throw transactionError;

  // 更新持仓
  const { data: positionData } = await supabase
    .from('portfolio_positions')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .eq('stock_id', stockId);

  if (positionData && positionData.length > 0) {
    // 持仓已存在，更新数量和平均成本
    const currentPosition = positionData[0];
    let newQuantity, newAvgCost;

    if (transactionType === 'buy') {
      newQuantity = currentPosition.quantity + quantity;
      newAvgCost = ((currentPosition.quantity * currentPosition.avg_cost) + totalValue) / newQuantity;
    } else {
      newQuantity = currentPosition.quantity - quantity;
      newAvgCost = currentPosition.avg_cost; // 卖出不影响平均成本

      // 如果卖空了，数量变为负数（允许做空）或限制不能卖超过持有量
      if (newQuantity < 0) {
        throw new Error('Cannot sell more than held quantity');
      }
    }

    if (newQuantity === 0) {
      // 如果数量为0，删除持仓记录
      const { error: deletePositionError } = await supabase
        .from('portfolio_positions')
        .delete()
        .eq('id', currentPosition.id);

      if (deletePositionError) throw deletePositionError;
    } else {
      // 更新持仓
      const { error: updatePositionError } = await supabase
        .from('portfolio_positions')
        .update({
          quantity: newQuantity,
          avg_cost: newAvgCost
        })
        .eq('id', currentPosition.id);

      if (updatePositionError) throw updatePositionError;
    }
  } else if (transactionType === 'buy') {
    // 新建持仓（只对买入操作）
    const { error: newPositionError } = await supabase
      .from('portfolio_positions')
      .insert([{
        portfolio_id: portfolioId,
        stock_id: stockId,
        quantity,
        avg_cost: price
      }]);

    if (newPositionError) throw newPositionError;
  }

  return transactionData;
};