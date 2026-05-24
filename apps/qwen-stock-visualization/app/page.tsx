'use client';

import { useState, useEffect } from 'react';
import SimpleAuthForm from '@/components/SimpleAuthForm';
import EnhancedDashboard from '@/components/EnhancedDashboard';
import { useSimpleAuth } from '@/components/SimpleAuthProvider';

export default function HomePage() {
  const { user, isLoading } = useSimpleAuth();

  if (isLoading) {
    // Loading state while checking auth
    return (
      <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {user ? <EnhancedDashboard /> : <SimpleAuthForm />}
    </div>
  );
}