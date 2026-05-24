-- Simplified database schema with basic user authentication

-- Create a simple users table for storing user information
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table to store user sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Stocks Table for storing stock metadata
CREATE TABLE IF NOT EXISTS stocks (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  exchange VARCHAR(50),
  currency VARCHAR(10) DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Stock Prices table for storing real-time price data
CREATE TABLE IF NOT EXISTS stock_prices (
  id SERIAL PRIMARY KEY,
  stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  change_amount DECIMAL(10, 2),
  change_percent DECIMAL(5, 2),
  volume BIGINT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Watchlists table for user's favorite stocks
CREATE TABLE IF NOT EXISTS watchlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, stock_id)
);

-- Create Portfolios table for user's investment portfolios
CREATE TABLE IF NOT EXISTS portfolios (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  initial_balance DECIMAL(15, 2) NOT NULL DEFAULT 100000.00,
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 100000.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Portfolio Positions table for tracking holdings
CREATE TABLE IF NOT EXISTS portfolio_positions (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  avg_cost DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(portfolio_id, stock_id)
);

-- Create Portfolio Transactions table for recording trades
CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
  transaction_type VARCHAR(10) CHECK (transaction_type IN ('buy', 'sell')) NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  total_value DECIMAL(15, 2) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_stocks_symbol ON stocks(symbol);
CREATE INDEX idx_stock_prices_stock_timestamp ON stock_prices(stock_id, timestamp DESC);
CREATE INDEX idx_watchlists_user_stock ON watchlists(user_id, stock_id);
CREATE INDEX idx_portfolios_user ON portfolios(user_id);
CREATE INDEX idx_portfolio_positions_portfolio_stock ON portfolio_positions(portfolio_id, stock_id);
CREATE INDEX idx_portfolio_transactions_portfolio_timestamp ON portfolio_transactions(portfolio_id, timestamp DESC);

-- Insert sample stock data
INSERT INTO stocks (symbol, name, exchange) VALUES
  ('AAPL', 'Apple Inc.', 'NASDAQ'),
  ('MSFT', 'Microsoft Corporation', 'NASDAQ'),
  ('GOOGL', 'Alphabet Inc.', 'NASDAQ'),
  ('AMZN', 'Amazon.com Inc.', 'NASDAQ'),
  ('TSLA', 'Tesla Inc.', 'NASDAQ'),
  ('META', 'Meta Platforms Inc.', 'NASDAQ'),
  ('NVDA', 'NVIDIA Corporation', 'NASDAQ'),
  ('NFLX', 'Netflix Inc.', 'NASDAQ'),
  ('DIS', 'The Walt Disney Company', 'NYSE'),
  ('JPM', 'JPMorgan Chase & Co.', 'NYSE')
ON CONFLICT (symbol) DO NOTHING;