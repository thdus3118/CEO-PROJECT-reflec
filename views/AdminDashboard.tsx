
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { DB } from '../store';

interface AdminDashboardProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'teachers' | 'settings'>(user.isFirstLogin ? 'settings' : 'teachers');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ name: '', loginId: '', password: '0000' });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [adminPasswords, setAdminPasswords] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => { refreshData(); }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const refreshData = () => {
    setAllUsers(DB.getUsers());
  };

  const teachers = allUsers.filter(u => u.role === UserRole.TEACHER);

  const handleAdminPasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    const currentInput = adminPasswords.current.trim();
    const nextInput = adminPasswords.next.trim();
    const confirmInput = adminPasswords.confirm.trim();

    if (currentInput !== user.passwordHash) { 
      alert("현재 관리자 비밀번호가 일치하지 않습니다."); 
      return; 
    }
    if (nextInput !== confirmInput) { 
      alert("새 비밀번호 확인이 일치하지 않습니다."); 
      return; 
    }
    
    if (!/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(nextInput)) {
      alert("비밀번호는 8자리 이상의 영문+숫자+특수문자 조합이어야 합니다.");
      return;
    }

    const updatedUser = { ...user, passwordHash: nextInput, isFirstLogin: false };
    const nextUsers = DB.getUsers().map(u => u.id === user.id ? updatedUser : u);
    
    DB.setUsers(nextUsers);
    setAdminPasswords({ current: '', next: '', confirm: '' });
    
    // 중요: 상위 상태 업데이트 후 탭 전환
    onUpdateUser(updatedUser);
    setActiveTab('teachers');
    alert("보안 업데이트가 완료되었습니다. 관리 업무를 시작합니다.");
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacher.name.trim() || !newTeacher.loginId.trim()) return;

    const existing = DB.getUsers().find(u => u.loginId === newTeacher.loginId.trim());
    if (existing) {
      alert("이미 존재하는 아이디입니다.");
      return;
    }

    DB.addTeacher({
      name: newTeacher.name.trim(),
      loginId: newTeacher.loginId.trim(),
      passwordHash: newTeacher.password
    });

    setNewTeacher({ name: '', loginId: '', password: '0000' });
    setIsAddingTeacher(false);
    refreshData();
    setSuccessMessage("신규 교사 계정이 생성되었습니다.");
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    if (currentStatus) {
      if (confirm("이 계정을 비활성화하시겠습니까? 데이터는 유지되지만 로그인이 불가능해집니다.")) {
        DB.deactivateUser(id);
        refreshData();
        setSuccessMessage("계정이 비활성화되었습니다.");
      }
    } else {
      DB.reactivateUser(id);
      refreshData();
      setSuccessMessage("계정이 다시 활성화되었습니다.");
    }
  };

  const resetTeacherPassword = (id: string) => {
    if (confirm("해당 교사의 비밀번호를 '0000'으로 초기화하시겠습니까?")) {
      DB.resetUserPassword(id);
      setSuccessMessage("비밀번호가 '0000'으로 초기화되었습니다.");
    }
  };

  if (user.isFirstLogin) {
    return (
      <div className="max-w-xl mx-auto space-y-8 py-12 animate-in slide-in-from-bottom-4">
        <div className="bg-white p-12 rounded-[3rem] border border-indigo-100 shadow-2xl space-y-10 text-center">
          <div className="w-24 h-24 bg-slate-800 text-white rounded-[2rem] flex items-center justify-center mx-auto text-4xl">🛡️</div>
          <div className="space-y-3">
            <h3 className="text-3xl font-black text-slate-800">최고 관리자 인증 강화</h3>
            <p className="text-sm text-slate-400 font-bold leading-relaxed">시스템 보안을 위해 최고 관리자의 초기 비밀번호를<br/>반드시 변경해야 합니다.</p>
          </div>
          <form onSubmit={handleAdminPasswordChange} className="space-y-4 text-left">
            <input type="password" placeholder="현재 비밀번호 (기초: 0000)" required value={adminPasswords.current} onChange={e => setAdminPasswords({...adminPasswords, current: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="password" placeholder="새 비밀번호 (8자 이상 영숫자+특수문자)" required value={adminPasswords.next} onChange={e => setAdminPasswords({...adminPasswords, next: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="password" placeholder="새 비밀번호 확인" required value={adminPasswords.confirm} onChange={e => setAdminPasswords({...adminPasswords, confirm: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
            <button type="submit" className="w-full bg-slate-800 text-white py-6 rounded-2xl font-black shadow-xl shadow-slate-100 hover:bg-black transition-all transform active:scale-95">보안 업데이트 및 관리 시작</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] bg-slate-800 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-2xl animate-in slide-in-from-top-4 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
          {successMessage}
        </div>
      )}

      <div className="bg-slate-800 rounded-[2.5rem] p-10 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h2 className="text-3xl font-black tracking-tight">시스템 관리자 대시보드</h2>
          <p className="text-slate-400 font-bold">전체 교사 계정 및 시스템 설정을 관리합니다.</p>
        </div>
        <div className="bg-white/10 px-8 py-5 rounded-[2rem] border border-white/10 text-center">
          <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">등록된 전체 교사</div>
          <div className="text-5xl font-black leading-none">{teachers.length}명</div>
        </div>
      </div>

      <div className="flex gap-2 bg-white p-2 rounded-[1.5rem] border border-slate-200 shadow-sm w-fit mx-auto md:mx-0">
        <button onClick={() => setActiveTab('teachers')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'teachers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>👨‍🏫 교사 관리</button>
        <button onClick={() => setActiveTab('settings')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>⚙️ 시스템 설정</button>
      </div>

      {activeTab === 'teachers' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-xl font-black text-slate-800">교사 계정 목록</h3>
            <button onClick={() => setIsAddingTeacher(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100">+ 신규 교사 등록</button>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <tr>
                  <th className="p-6">이름</th>
                  <th className="p-6">아이디</th>
                  <th className="p-6">상태</th>
                  <th className="p-6 text-right">관리 옵션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map(t => (
                  <tr key={t.id} className={`hover:bg-slate-50/50 transition-all ${!t.isActive ? 'opacity-50 grayscale bg-slate-100' : ''}`}>
                    <td className="p-6 font-black text-slate-700 text-lg">{t.name}</td>
                    <td className="p-6 font-bold text-slate-500">{t.loginId}</td>
                    <td className="p-6">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${t.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                        {t.isActive ? '정상 활성' : '비활성'}
                      </span>
                    </td>
                    <td className="p-6 text-right space-x-2">
                      <button onClick={() => resetTeacherPassword(t.id)} className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">비번 초기화</button>
                      <button onClick={() => handleToggleActive(t.id, t.isActive)} className={`text-[10px] font-black px-4 py-2 rounded-xl transition-all ${t.isActive ? 'text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white' : 'text-emerald-500 bg-emerald-50 hover:bg-emerald-500 hover:text-white'}`}>
                        {t.isActive ? '계정 비활성화' : '계정 재활성화'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-xl mx-auto animate-in slide-in-from-bottom-4">
          <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-2xl font-black text-slate-800">관리자 보안 설정</h3>
            <form onSubmit={handleAdminPasswordChange} className="space-y-4">
              <input type="password" required value={adminPasswords.current} onChange={e => setAdminPasswords({...adminPasswords, current: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="현재 비밀번호" />
              <input type="password" required value={adminPasswords.next} onChange={e => setAdminPasswords({...adminPasswords, next: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="새 비밀번호" />
              <input type="password" required value={adminPasswords.confirm} onChange={e => setAdminPasswords({...adminPasswords, confirm: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="새 비밀번호 확인" />
              <button type="submit" className="w-full bg-slate-800 text-white py-6 rounded-[1.5rem] font-black hover:bg-black transition-all">비밀번호 업데이트</button>
            </form>
          </div>
        </div>
      )}

      {isAddingTeacher && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsAddingTeacher(false)}></div>
          <form onSubmit={handleAddTeacher} className="relative w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl space-y-6">
            <h3 className="text-2xl font-black text-slate-800 text-center">신규 교사 계정 생성</h3>
            <div className="space-y-4">
              <input type="text" placeholder="교사 성함" required value={newTeacher.name} onChange={e => setNewTeacher({...newTeacher, name: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
              <input type="text" placeholder="로그인 아이디" required value={newTeacher.loginId} onChange={e => setNewTeacher({...newTeacher, loginId: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
              <input type="password" placeholder="초기 비밀번호" required value={newTeacher.password} onChange={e => setNewTeacher({...newTeacher, password: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setIsAddingTeacher(false)} className="flex-1 py-5 bg-slate-100 font-black rounded-2xl">취소</button>
              <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl">계정 생성</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
