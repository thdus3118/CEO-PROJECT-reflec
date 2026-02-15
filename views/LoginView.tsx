
import React, { useState, useEffect } from 'react';
import { DB } from '../store';
import { User, UserRole, ClassInfo } from '../types';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [loginId, setLoginId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedClassId, setSelectedClassId] = useState('');

  useEffect(() => {
    setClasses(DB.getClasses());
  }, []);

  const filteredClasses = classes.filter(c => c.year === selectedYear);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const users = DB.getUsers();
    let user: User | undefined;

    if (role === UserRole.STUDENT) {
      if (!selectedClassId) { setError('학급을 선택해주세요.'); return; }
      user = users.find(u => 
        u.role === UserRole.STUDENT && 
        u.classId === selectedClassId && 
        u.studentId === studentId && 
        u.passwordHash === password &&
        u.isActive
      );
    } else {
      user = users.find(u => u.role === role && u.loginId === loginId && u.passwordHash === password && u.isActive);
    }

    if (user) {
      onLogin(user);
    } else {
      setError('로그인 정보가 올바르지 않거나 비활성화된 계정입니다.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white text-center">
          <div className="inline-block bg-white/20 p-3 rounded-2xl mb-4">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">성찰노트 서비스</h2>
          <p className="text-indigo-100 mt-1 font-medium">로그인하여 학습을 돌아보세요</p>
        </div>

        <div className="p-8">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            {[UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN].map(r => (
              <button
                key={r}
                onClick={() => { setRole(r); setError(''); }}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${role === r ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
              >
                {r === UserRole.STUDENT ? '학생' : r === UserRole.TEACHER ? '교사' : '관리자'}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {role === UserRole.STUDENT ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">학년도</label>
                    <select 
                      value={selectedYear} 
                      onChange={e => setSelectedYear(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
                    >
                      {years.map(y => <option key={y} value={y.toString()}>{y}학년도</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">학급 선택</label>
                    <select 
                      value={selectedClassId} 
                      onChange={e => setSelectedClassId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
                      required
                    >
                      <option value="">학급 선택</option>
                      {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">학번 (예: 10301)</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    placeholder="학번 입력"
                    required
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">아이디</label>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  placeholder={role === UserRole.ADMIN ? "admin" : "교사 아이디"}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                placeholder="••••"
                required
              />
            </div>

            {error && <p className="text-rose-500 text-xs font-black text-center animate-bounce">{error}</p>}

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 mt-2"
            >
              로그인
            </button>
          </form>

          <p className="mt-6 text-center text-slate-400 text-[10px] font-bold">
            기초 비밀번호는 0000 입니다. 최초 로그인 시 변경을 권장합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
