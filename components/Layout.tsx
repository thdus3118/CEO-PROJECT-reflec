
import React from 'react';
import { User, UserRole } from '../types';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">성찰노트</h1>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-700">{user.name}</p>
                <p className="text-xs text-slate-500 font-bold">
                  {user.role === UserRole.ADMIN ? '시스템 관리자' 
                   : user.role === UserRole.TEACHER ? '선생님' 
                   : `${user.studentId} 학생`}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="text-sm font-black text-slate-400 hover:text-indigo-600 transition-colors"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t py-6 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
        &copy; {new Date().getFullYear()} Reflection Note. Educational Solution.
      </footer>
    </div>
  );
};

export default Layout;
