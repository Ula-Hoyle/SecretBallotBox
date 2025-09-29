"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="glass sticky top-0 z-50 px-6 py-4 mb-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">SecretBallotBox</h1>
              <p className="text-xs text-gray-500">匿名投票平台</p>
            </div>
          </Link>

          <div className="flex items-center space-x-6">
            <Link 
              href="/" 
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                isActive('/') 
                  ? 'bg-primary-100 text-primary-700 shadow-glow-sm' 
                  : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
              }`}
            >
              首页
            </Link>
            <Link 
              href="/vote" 
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                isActive('/vote') 
                  ? 'bg-primary-100 text-primary-700 shadow-glow-sm' 
                  : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
              }`}
            >
              创建投票
            </Link>
            <Link 
              href="/ballots" 
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                isActive('/ballots') 
                  ? 'bg-primary-100 text-primary-700 shadow-glow-sm' 
                  : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
              }`}
            >
              投票列表
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pb-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="glass mt-20 px-6 py-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-sm text-gray-600">基于 FHEVM 的匿名投票系统</span>
          </div>
          <p className="text-xs text-gray-500">
            使用同态加密技术确保投票隐私 • 链上透明可验证
          </p>
        </div>
      </footer>
    </div>
  );
}


