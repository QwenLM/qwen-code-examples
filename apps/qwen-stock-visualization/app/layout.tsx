import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SimpleAuthProvider } from '@/components/SimpleAuthProvider';
import Navbar from '@/components/Navbar';
import BootstrapClient from '@/components/BootstrapClient';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '股票数据实时可视化系统',
  description: '一个直观、交互性强且个性化的股票数据可视化与模拟投资平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} min-h-screen d-flex flex-column`}>
        <SimpleAuthProvider>
          <Navbar />
          <main className="flex-grow-1">
            {children}
          </main>
          <footer className="py-4 bg-light text-center text-muted">
            <div className="container">
              <p className="mb-0">© {new Date().getFullYear()} 股票数据实时可视化系统 - 专业的投资分析工具</p>
            </div>
          </footer>
        </SimpleAuthProvider>
        <BootstrapClient />
      </body>
    </html>
  );
}