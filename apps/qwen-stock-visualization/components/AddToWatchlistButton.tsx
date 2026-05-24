'use client';

import { useState, useEffect } from 'react';
import { addToWatchlist, removeFromWatchlist } from '@/lib/stockDataLayer';

export default function AddToWatchlistButton({
  userId,
  stockId,
  isInWatchlist,
  onAdded,
  onRemoved
}: {
  userId: number;
  stockId: number;
  isInWatchlist: boolean;
  onAdded: () => void;
  onRemoved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(isInWatchlist);

  useEffect(() => {
    setIsAdded(isInWatchlist);
  }, [isInWatchlist]);

  const handleClick = async () => {
    if (loading) return; // 防止重复点击

    setLoading(true);
    try {
      let success = false;
      if (isAdded) {
        // 如果已在自选股中，则移除
        success = await removeFromWatchlist(stockId, localStorage.getItem('auth_token'));
        if (success) {
          setIsAdded(false);
          onRemoved(); // 触发父组件的更新回调
        }
      } else {
        // 如果不在自选股中，则添加
        success = await addToWatchlist(userId, stockId, localStorage.getItem('auth_token'));
        if (success) {
          setIsAdded(true);
          onAdded(); // 触发父组件的更新回调
        }
      }
    } catch (error) {
      console.error('Error updating watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`btn ${isAdded ? 'btn-success' : 'btn-outline-primary'} btn-sm`}
    >
      {loading ? (
        <>
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          处理中...
        </>
      ) : isAdded ? (
        '已添加 ✓'
      ) : (
        '添加到自选股'
      )}
    </button>
  );
}