import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from project root
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 定义股票数据接口
interface Stock {
  id: number;
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
}

// 定义股票价格接口
interface StockPrice {
  id: number;
  stock_id: number;
  price: string;
  change_amount: string;
  change_percent: string;
  volume: number;
  timestamp: string;
  created_at: string;
}

// 获取所有股票
async function getAllStocks(): Promise<Stock[]> {
  const { data, error } = await supabase
    .from('stocks')
    .select('*')
    .order('id');

  if (error) {
    console.error('Error fetching stocks:', error);
    return [];
  }

  return data as Stock[];
}

// 获取指定股票的最新价格
async function getLatestPrice(stockId: number): Promise<StockPrice | null> {
  const { data, error } = await supabase
    .from('stock_prices')
    .select('*')
    .eq('stock_id', stockId)
    .order('timestamp', { ascending: false })
    .limit(1);

  if (error) {
    console.error(`Error fetching latest price for stock ${stockId}:`, error);
    return null;
  }

  return data && data.length > 0 ? data[0] as StockPrice : null;
}

// 生成随机价格变动
function generateRandomPriceChange(currentPrice: number): { newPrice: number; changeAmount: number; changePercent: number } {
  // 价格变动范围在 -1 到 1 之间
  const change = (Math.random() * 2 - 1); // 生成 -1 到 1 之间的随机数
  const newPrice = Math.max(0.01, currentPrice + change); // 确保价格不低于 0.01
  const changeAmount = newPrice - currentPrice;
  const changePercent = (changeAmount / currentPrice) * 100;

  return {
    newPrice,
    changeAmount,
    changePercent
  };
}

// 插入新的价格记录
async function insertNewPrice(stockId: number, newPrice: number, changeAmount: number, changePercent: number) {
  const newPriceRecord = {
    stock_id: stockId,
    price: newPrice.toFixed(2),
    change_amount: changeAmount.toFixed(2),
    change_percent: changePercent.toFixed(2),
    volume: Math.floor(Math.random() * 1000000) + 100000, // 随机成交量
    timestamp: new Date().toISOString()
  };

  const { error } = await supabase
    .from('stock_prices')
    .insert([newPriceRecord]);

  if (error) {
    console.error(`Error inserting new price for stock ${stockId}:`, error);
  } else {
    console.log(`Updated price for ${stockId}: $${newPrice.toFixed(2)} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
  }
}

// 主函数：更新所有股票价格
async function updateAllStockPrices() {
  console.log('Fetching all stocks...');
  const stocks = await getAllStocks();

  if (stocks.length === 0) {
    console.log('No stocks found.');
    return;
  }

  console.log(`Updating prices for ${stocks.length} stocks...`);

  for (const stock of stocks) {
    try {
      // 获取最新价格
      const latestPrice = await getLatestPrice(stock.id);
      
      let currentPrice = 100; // 默认价格
      
      if (latestPrice) {
        currentPrice = parseFloat(latestPrice.price);
      } else {
        // 如果没有历史价格，使用一个随机初始价格
        currentPrice = 50 + Math.random() * 100; // 50-150 之间的随机价格
      }

      // 生成新的随机价格
      const { newPrice, changeAmount, changePercent } = generateRandomPriceChange(currentPrice);

      // 插入新的价格记录
      await insertNewPrice(stock.id, newPrice, changeAmount, changePercent);
    } catch (error) {
      console.error(`Error processing stock ${stock.id} (${stock.symbol}):`, error);
    }
  }
}

// 启动模拟服务器
function startMockServer() {
  console.log('🚀 Starting mock stock price server...');
  console.log('📊 Prices will be updated every 5 seconds');
  console.log('💡 Press Ctrl+C to stop the server\n');

  // 立即更新一次
  updateAllStockPrices().catch(console.error);

  // 每0.4秒更新一次价格
  setInterval(() => {
    updateAllStockPrices().catch(console.error);
  }, 400); // 0.4秒更新一次
}

// 启动服务器
startMockServer();

export {};