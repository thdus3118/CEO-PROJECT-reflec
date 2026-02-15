
import React, { useState, useEffect, useRef } from 'react';
import { User, Reflection, UserRole, ClassInfo } from '../types';
import { DB } from '../store';
import { aiService } from '../geminiService';

interface TeacherDashboardProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'students' | 'classes' | 'settings'>(user.isFirstLogin ? 'settings' : 'analysis');
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);

  const [newStudent, setNewStudent] = useState({ name: '', studentId: '', classId: '' });
  const [bulkData, setBulkData] = useState('');
  
  const currentYear = new Date().getFullYear();
  const [newClassName, setNewClassName] = useState('');
  const [newClassYear, setNewClassYear] = useState(currentYear.toString());
  const [newTargetDays, setNewTargetDays] = useState(190);

  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { refreshData(); checkApiKey(); }, []);

  const checkApiKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      const hasKey = await aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    }
  };

  const handleConnectApiKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      try {
        await aistudio.openSelectKey();
        setHasApiKey(true);
        setSuccessMessage("API 키가 성공적으로 연결되었습니다.");
      } catch (err) { console.error(err); }
    }
  };

  useEffect(() => {
    if (activeTab === 'analysis') {
      const cacheKey = `${selectedClassId}_${today}`;
      const cached = DB.getAnalyses()[cacheKey];
      setAnalysis(cached || null);
    }
  }, [selectedClassId, activeTab]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const refreshData = () => {
    const myClasses = DB.getClasses().filter(c => c.teacherId === user.id);
    setClasses(myClasses);
    const myClassIds = myClasses.map(c => c.id);
    const myStudents = DB.getUsers().filter(u => u.role === UserRole.STUDENT && myClassIds.includes(u.classId || '') && u.isActive);
    setStudents(myStudents);
    const myStudentIds = myStudents.map(u => u.id);
    const myReflections = DB.getReflections().filter(r => myStudentIds.includes(r.studentId));
    setReflections(myReflections);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    const currentInput = passwords.current.trim();
    const nextInput = passwords.next.trim();
    const confirmInput = passwords.confirm.trim();

    if (currentInput !== user.passwordHash) { alert("현재 비밀번호가 일치하지 않습니다."); return; }
    if (nextInput !== confirmInput) { alert("비밀번호 확인이 일치하지 않습니다."); return; }
    
    if (!/^(?=.*[a-zA-Z])(?=.*\d).{6,}$/.test(nextInput)) {
      alert("비밀번호는 6자리 이상의 영문+숫자 조합이어야 합니다.");
      return;
    }

    const updatedUser = { ...user, passwordHash: nextInput, isFirstLogin: false };
    const nextUsers = DB.getUsers().map(u => u.id === user.id ? updatedUser : u);
    
    DB.setUsers(nextUsers);
    setPasswords({ current: '', next: '', confirm: '' });
    setActiveTab('analysis'); // 탭 이동
    onUpdateUser(updatedUser);
    
    alert("보안 업데이트 완료! 대시보드로 이동합니다.");
  };

  const resetPassword = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("비밀번호를 '0000'으로 초기화하시겠습니까?")) {
      DB.resetStudentPassword(id);
      setSuccessMessage("비밀번호가 초기화되었습니다.");
      refreshData();
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.studentId || !newStudent.classId) return;
    try {
      DB.upsertStudent({ name: newStudent.name.trim(), studentId: newStudent.studentId.trim(), classId: newStudent.classId });
      setNewStudent({ name: '', studentId: '', classId: '' });
      setIsAddingStudent(false);
      refreshData();
      setSuccessMessage("학생이 등록되었습니다.");
    } catch (err: any) { alert(err.message); }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (selectedClassId === 'all') { alert("학급을 먼저 선택해주세요."); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const dataLines = lines.slice(1);
      const studentsToPulse = dataLines.map(line => {
        const parts = line.split(',');
        return { studentId: parts[0]?.trim(), name: parts[1]?.trim() || '이름없음', classId: selectedClassId };
      }).filter(s => s.studentId);
      const result = DB.bulkUpsertStudents(studentsToPulse);
      refreshData();
      let msg = `${result.count}명의 학생이 등록되었습니다.`;
      if (result.duplicates.length > 0) msg += `\n중복 학번 제외: ${result.duplicates.join(', ')}`;
      alert(msg);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = '';
  };

  const handleBulkAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkData || selectedClassId === 'all') { alert("학급을 선택하고 데이터를 입력해주세요."); return; }
    const lines = bulkData.split('\n').filter(l => l.trim());
    const studentsToPulse = lines.map(line => {
      const parts = line.split(/\s+/);
      return { studentId: parts[0].trim(), name: parts[1]?.trim() || '이름없음', classId: selectedClassId };
    });
    const result = DB.bulkUpsertStudents(studentsToPulse);
    setBulkData('');
    setIsBulkAdding(false);
    refreshData();
    let msg = `${result.count}명의 학생이 등록되었습니다.`;
    if (result.duplicates.length > 0) msg += `\n중복 학번 제외: ${result.duplicates.join(', ')}`;
    alert(msg);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const newClass: ClassInfo = {
      id: crypto.randomUUID(),
      name: newClassName.trim(),
      year: newClassYear,
      teacherId: user.id,
      targetDays: newTargetDays
    };
    DB.setClasses([...DB.getClasses(), newClass]);
    setNewClassName('');
    setIsAddingClass(false);
    refreshData();
    setSuccessMessage("학급이 생성되었습니다.");
  };

  const handleUpdateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    const updatedClasses = DB.getClasses().map(c => c.id === editingClass.id ? editingClass : c);
    DB.setClasses(updatedClasses);
    setEditingClass(null);
    refreshData();
    setSuccessMessage("학급 정보가 수정되었습니다.");
  };

  const getStudentReflections = (studentId: string) => {
    return reflections.filter(r => r.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date));
  };

  const filteredStudents = selectedClassId === 'all' ? students : students.filter(s => s.classId === selectedClassId);

  const handleExportCSV = () => {
    const targetClass = classes.find(c => c.id === selectedClassId);
    const className = targetClass ? targetClass.name : '전체_학생';
    let csvContent = "\uFEFF학번,이름,날짜,수업태도,학습내용,학습활동,협동성찰,AI감정,AI피드백,교사피드백\n";
    filteredStudents.forEach(s => {
      const sReflections = reflections.filter(r => r.studentId === s.id);
      sReflections.forEach(r => {
        const row = [s.studentId, s.name, r.date, r.attitudeRating, `"${r.learnedContent.replace(/"/g, '""')}"`, `"${r.activities.replace(/"/g, '""')}"`, `"${r.collaboration.replace(/"/g, '""')}"`, r.sentiment || 'N/A', `"${(r.aiFeedback || '').replace(/"/g, '""')}"`, `"${(r.teacherFeedback || '').replace(/"/g, '""')}"` ];
        csvContent += row.join(",") + "\n";
      });
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `성찰기록_${className}_${today}.csv`;
    link.click();
  };

  const handleSaveTeacherFeedback = (reflectionId: string, feedback: string) => {
    DB.updateReflectionFeedback(reflectionId, feedback.trim());
    refreshData();
    setSuccessMessage("피드백이 저장되었습니다.");
  };

  const handleDeleteFeedback = (reflectionId: string) => {
    if (confirm("피드백을 삭제하시겠습니까?")) {
      DB.updateReflectionFeedback(reflectionId, '');
      refreshData();
      setSuccessMessage("피드백이 삭제되었습니다.");
    }
  };

  const runAnalysis = async () => {
    if (!hasApiKey || selectedClassId === 'all') return;
    setIsAnalyzing(true);
    const todays = reflections
      .filter(r => r.date === today && filteredStudents.some(s => s.id === r.studentId))
      .map(r => ({ ...r, studentName: students.find(s => s.id === r.studentId)?.name || '알 수 없음' }));
    if (todays.length === 0) { alert("오늘 데이터가 없습니다."); setIsAnalyzing(false); return; }
    try {
      const result = await aiService.analyzeClassroomIssues(todays);
      const cacheKey = `${selectedClassId}_${today}`;
      DB.setAnalysis(cacheKey, result);
      setAnalysis(result);
    } catch (err) { alert("분석 중 오류 발생"); }
    finally { setIsAnalyzing(false); }
  };

  if (user.isFirstLogin) {
    return (
      <div className="max-w-xl mx-auto space-y-8 py-12 animate-in slide-in-from-bottom-4">
        <div className="bg-white p-12 rounded-[3rem] border border-indigo-100 shadow-2xl space-y-10 text-center">
          <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto text-4xl">🔑</div>
          <div className="space-y-3">
            <h3 className="text-3xl font-black text-slate-800">선생님, 비밀번호를 변경해주세요</h3>
            <p className="text-sm text-slate-400 font-bold leading-relaxed">보안을 위해 6자리 이상의 영문+숫자 조합으로<br/>새 비밀번호를 설정해야 서비스 이용이 가능합니다.</p>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4 text-left">
            <input type="password" placeholder="현재 비밀번호 (기초: 0000)" required value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
            <input type="password" placeholder="새 비밀번호 (6자 이상 영문+숫자)" required value={passwords.next} onChange={e => setPasswords({...passwords, next: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
            <input type="password" placeholder="새 비밀번호 확인" required value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
            <button type="submit" className="w-full bg-indigo-600 text-white py-6 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all transform active:scale-95">보안 업데이트 및 시작하기</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 pb-12 animate-in fade-in duration-500">
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] bg-slate-800 text-white px-8 py-4 rounded-2xl font-black shadow-2xl animate-in slide-in-from-top-4 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{user.name} 선생님</h2>
          <div className="flex items-center gap-2 mt-2">
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border-none outline-none cursor-pointer">
              <option value="all">전체 학생 명단</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.year})</option>)}
            </select>
            <button onClick={handleExportCSV} className="text-xs font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors">엑셀(CSV) 다운로드</button>
          </div>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          {[ { id: 'analysis', label: 'AI 분석', icon: '📊' }, { id: 'students', label: '학생 관리', icon: '🧑‍🎓' }, { id: 'classes', label: '학급 설정', icon: '🏫' }, { id: 'settings', label: '개인 설정', icon: '⚙️' } ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'analysis' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
           {!hasApiKey && (
             <div className="bg-rose-600 text-white p-8 rounded-[2rem] shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 animate-pulse">
                <div>
                  <h4 className="font-black text-xl">AI 분석이 준비되지 않았습니다</h4>
                  <p className="text-sm font-bold text-rose-100">분석 기능을 사용하려면 개인 설정에서 API 키를 연결해주세요.</p>
                </div>
                <button onClick={() => setActiveTab('settings')} className="bg-white text-rose-600 px-8 py-4 rounded-xl font-black text-sm">설정으로 이동</button>
             </div>
           )}
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="space-y-1">
                <h3 className="font-black text-slate-800 text-2xl">{selectedClassId === 'all' ? '학급을 선택해주세요' : `${classes.find(c => c.id === selectedClassId)?.name} AI 가이드`}</h3>
                <p className="text-sm text-slate-400 font-bold">학습 부진, 관계 갈등, 정서적 이상 징후를 집중적으로 분석합니다.</p>
              </div>
              <button onClick={runAnalysis} disabled={isAnalyzing || selectedClassId === 'all' || !hasApiKey} className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black hover:bg-indigo-700 disabled:bg-slate-200 transition-all shadow-xl shadow-indigo-100">
                {isAnalyzing ? "Gemini가 분석 중..." : "오늘의 학급 분석 시작"}
              </button>
           </div>
           {analysis && (
             <div className="space-y-6 animate-in slide-in-from-bottom-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">평균 수업 만족도</label>
                    <div className="text-3xl font-black text-amber-500 mt-1">{analysis.statistics.averageRating.toFixed(1)} <span className="text-sm text-slate-300">/ 5.0</span></div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">긍정 성찰 비중</label>
                    <div className="text-3xl font-black text-emerald-500 mt-1">{analysis.statistics.positiveCount} <span className="text-sm text-slate-300">명</span></div>
                  </div>
                  <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 shadow-sm">
                    <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest">집중 지도 권고</label>
                    <div className="text-3xl font-black text-rose-600 mt-1">{analysis.statistics.alertCount} <span className="text-sm text-rose-300">건</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm p-10 space-y-10">
                  <section><label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-3 block">학급 전체 브리핑</label><p className="text-slate-700 leading-relaxed text-xl font-bold">{analysis.summary}</p></section>
                  <section className="space-y-4">
                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] block">지도가 필요한 학생 알림</label>
                    <div className="grid gap-4">
                      {analysis.detectedIssues.map((issue: any, i: number) => {
                        const isHigh = issue.severity === 'high';
                        const typeColors: Record<string, string> = { '학업부진': 'bg-amber-50 border-amber-100 text-amber-700', '관계갈등': 'bg-rose-50 border-rose-100 text-rose-700', '정서위기': 'bg-indigo-50 border-indigo-100 text-indigo-700', '태도불량': 'bg-slate-50 border-slate-100 text-slate-700' };
                        return (
                          <div key={i} className={`${typeColors[issue.issueType] || 'bg-slate-50 border-slate-100 text-slate-700'} p-8 rounded-[2rem] border-2 flex flex-col md:flex-row justify-between gap-6 cursor-pointer hover:scale-[1.01] transition-transform`} onClick={() => { const s = students.find(st => st.name === issue.studentName); if (s) setSelectedStudent(s); }}>
                            <div className="space-y-3">
                              <div className="flex items-center gap-3"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isHigh ? 'bg-rose-600 text-white' : 'bg-white border'}`}>{issue.issueType} {isHigh && '(!) Urgent'}</span><h4 className="text-xl font-black">{issue.studentName}</h4></div>
                              <p className="text-sm font-bold opacity-90">{issue.description}</p>
                            </div>
                            <div className="md:w-1/3 bg-white/50 p-4 rounded-2xl border border-black/5"><label className="text-[9px] font-black opacity-50 block mb-1">교사 지도 가이드</label><p className="text-xs font-bold leading-relaxed">{issue.actionTip}</p></div>
                          </div>
                        );
                      })}
                      {analysis.detectedIssues.length === 0 && <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed text-slate-300 font-black text-xl">오늘 학급에 큰 문제 징후가 없습니다. 😊</div>}
                    </div>
                  </section>
                </div>
             </div>
           )}
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h3 className="font-black text-slate-800 text-xl">학생 명단 관리 <span className="text-slate-400 ml-2 text-sm">{filteredStudents.length}명</span></h3>
            <div className="flex gap-2">
              <button onClick={() => setIsBulkAdding(true)} className="bg-indigo-50 text-indigo-600 text-xs font-black px-6 py-3 rounded-xl hover:bg-indigo-100">📥 대량 등록</button>
              <button onClick={() => setIsAddingStudent(true)} className="bg-slate-800 text-white text-xs font-black px-6 py-3 rounded-xl hover:bg-black shadow-lg">+ 학생 개별 등록</button>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <tr><th className="p-6">학번 / 이름</th><th className="p-6">소속 학급</th><th className="p-6">성찰 횟수</th><th className="p-6 text-right">관리</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(s => (
                  <tr key={s.id} className="hover:bg-indigo-50/30 transition-all cursor-pointer group" onClick={() => setSelectedStudent(s)}>
                    <td className="p-6"><div className="font-black text-slate-700 text-lg group-hover:text-indigo-600">{s.name}</div><div className="text-[10px] text-slate-400 font-bold">{s.studentId}</div></td>
                    <td className="p-6"><span className="text-xs font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">{classes.find(c => c.id === s.classId)?.name || '미지정'}</span></td>
                    <td className="p-6"><span className="text-sm font-black text-indigo-500">{reflections.filter(r => r.studentId === s.id).length}회</span></td>
                    <td className="p-6 text-right"><button onClick={(e) => resetPassword(s.id, e)} className="text-[10px] font-black text-rose-500 bg-rose-50 px-4 py-2 rounded-xl hover:bg-rose-500 hover:text-white sm:opacity-0 group-hover:opacity-100 transition-all">비번 초기화</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-800">운영 중인 학급 목록</h3>
            <button onClick={() => { setNewClassName(''); setIsAddingClass(true); }} className="text-sm font-black text-indigo-600 hover:underline">+ 새 학급 생성</button>
          </div>
          <div className="grid gap-4">
            {classes.map(c => (
              <div key={c.id} className="p-6 bg-slate-50 rounded-[1.5rem] flex justify-between items-center border-2 border-transparent hover:border-indigo-100 transition-all">
                <div>
                  <div className="font-black text-slate-800 text-lg">{c.name} <span className="text-xs text-indigo-500 ml-1">({c.year}학년도)</span></div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">목표 {c.targetDays}일 | {students.filter(s => s.classId === c.id).length}명 수강</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); setEditingClass({...c}); }} className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">수정</button>
                  <button onClick={(e) => { e.stopPropagation(); if(confirm('삭제할까요?')) { DB.deleteClass(c.id); refreshData(); } }} className="text-[10px] font-black text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg">삭제</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-2xl font-black text-slate-800">교사 보안 설정</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <input type="password" placeholder="현재 비밀번호" required value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
              <input type="password" placeholder="새 비밀번호 (6자 이상 영문+숫자)" required value={passwords.next} onChange={e => setPasswords({...passwords, next: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
              <input type="password" placeholder="새 비밀번호 확인" required value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
              <button type="submit" className="w-full bg-slate-800 text-white py-5 rounded-2xl font-black shadow-xl">비밀번호 변경</button>
            </form>
          </div>
          <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
            <div><h3 className="text-2xl font-black text-slate-800">Gemini AI 서비스 연결</h3><p className="text-sm text-slate-400 font-bold mt-2 leading-relaxed">자신의 API 키를 연결하여 학급 분석 기능을 활성화하세요.</p></div>
            <div className={`p-8 rounded-[2rem] border-2 flex items-center justify-between gap-6 ${hasApiKey ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center gap-4"><div className={`w-4 h-4 rounded-full ${hasApiKey ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div><div className="font-black text-slate-700">AI 분석 엔진: {hasApiKey ? '활성화됨' : '비활성'}</div></div>
              <button onClick={handleConnectApiKey} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black text-sm">{hasApiKey ? '키 다시 연결' : 'Gemini 연결하기'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-lg" onClick={() => setSelectedStudent(null)}></div>
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            <div className="p-10 border-b flex justify-between items-center"><div className="flex items-center gap-6"><div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black">{selectedStudent.name[0]}</div><div><h3 className="text-2xl font-black text-slate-800">{selectedStudent.name}</h3><p className="text-sm font-bold text-slate-400">{selectedStudent.studentId}</p></div></div><button onClick={() => setSelectedStudent(null)} className="p-4 hover:bg-slate-100 rounded-full">✕</button></div>
            <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/50">
              {getStudentReflections(selectedStudent.id).map(r => (
                <div key={r.id} className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6">
                  <div className="flex justify-between items-center"><span className="text-xs font-black text-indigo-600">{r.date}</span><span className="text-amber-400">{'★'.repeat(r.attitudeRating)}</span></div>
                  <div className="space-y-4 text-sm font-bold text-slate-700 leading-relaxed"><p><span className="text-[10px] text-slate-300 block">학습</span>{r.learnedContent}</p><p><span className="text-[10px] text-slate-300 block">활동</span>{r.activities}</p><p><span className="text-[10px] text-slate-300 block">협동</span>{r.collaboration}</p></div>
                  <div className="pt-4 border-t border-slate-50 flex flex-col gap-2"><div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">교사 피드백</label>{r.teacherFeedback && <button onClick={() => handleDeleteFeedback(r.id)} className="text-[9px] font-black text-rose-400 hover:text-rose-600">피드백 삭제</button>}</div><textarea defaultValue={r.teacherFeedback || ''} onBlur={(e) => handleSaveTeacherFeedback(r.id, e.target.value)} placeholder="이 학생에게 남길 한 마디를 적어주세요..." className="w-full p-4 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={2} /></div>
                </div>
              ))}
              {getStudentReflections(selectedStudent.id).length === 0 && <div className="py-20 text-center text-slate-300 font-black">기록이 없습니다.</div>}
            </div>
          </div>
        </div>
      )}

      {isBulkAdding && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsBulkAdding(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black text-slate-800">학생 대량 등록</h3>
            <div className="space-y-4"><label className="block text-xs font-black text-slate-400">텍스트 붙여넣기 방식</label><textarea rows={6} value={bulkData} onChange={e => setBulkData(e.target.value)} placeholder="10301 홍길동..." className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" /><button onClick={handleBulkAdd} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100">입력된 정보로 등록 시작</button></div>
            <div className="pt-4 border-t border-slate-100 space-y-4"><label className="block text-xs font-black text-slate-400">CSV 파일 업로드 방식</label><button onClick={() => csvFileInputRef.current?.click()} className="w-full py-5 bg-emerald-50 text-emerald-600 border-2 border-dashed border-emerald-200 rounded-2xl font-black flex items-center justify-center gap-2">파일 선택하기 (.csv)</button><input type="file" ref={csvFileInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" /></div>
            <div className="flex gap-3"><button type="button" onClick={() => setIsBulkAdding(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl">취소</button></div>
          </div>
        </div>
      )}

      {isAddingStudent && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsAddingStudent(false)}></div>
          <form onSubmit={handleAddStudent} className="relative w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl space-y-6">
            <h3 className="text-2xl font-black text-slate-800 text-center">학생 등록</h3>
            <input type="text" placeholder="이름" required value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
            <input type="text" placeholder="학번" required value={newStudent.studentId} onChange={e => setNewStudent({...newStudent, studentId: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
            <select required value={newStudent.classId} onChange={e => setNewStudent({...newStudent, classId: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none">
              <option value="">학급 선택</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-3"><button type="button" onClick={() => setIsAddingStudent(false)} className="flex-1 py-5 bg-slate-100 font-black rounded-2xl">취소</button><button type="submit" className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-2xl">등록</button></div>
          </form>
        </div>
      )}

      {/* 학급 생성 모달 */}
      {isAddingClass && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsAddingClass(false)}></div>
          <form onSubmit={handleAddClass} className="relative w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl space-y-6 text-center">
            <h3 className="text-2xl font-black text-slate-800">신규 학급 생성</h3>
            <div className="space-y-4 text-left">
              <label className="block text-xs font-black text-slate-400">학급 명칭</label>
              <input type="text" placeholder="예: 1학년 3반" required value={newClassName} onChange={e => setNewClassName(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
              
              <label className="block text-xs font-black text-slate-400">학년도 설정</label>
              <select value={newClassYear} onChange={e => setNewClassYear(e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none">
                {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y.toString()}>{y}학년도</option>)}
              </select>

              <label className="block text-xs font-black text-slate-400">목표 수업일 수 (작성률 계산용)</label>
              <input type="number" value={newTargetDays} onChange={e => setNewTargetDays(parseInt(e.target.value))} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
            </div>
            <div className="flex gap-3"><button type="button" onClick={() => setIsAddingClass(false)} className="flex-1 py-5 bg-slate-100 font-black rounded-2xl">취소</button><button type="submit" className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-2xl">생성</button></div>
          </form>
        </div>
      )}

      {/* 학급 수정 모달 */}
      {editingClass && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setEditingClass(null)}></div>
          <form onSubmit={handleUpdateClass} className="relative w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl space-y-6 text-center">
            <h3 className="text-2xl font-black text-slate-800">학급 정보 수정</h3>
            <div className="space-y-4 text-left">
              <label className="block text-xs font-black text-slate-400">학급 명칭</label>
              <input type="text" required value={editingClass.name} onChange={e => setEditingClass({...editingClass, name: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
              
              <label className="block text-xs font-black text-slate-400">학년도 설정</label>
              <select value={editingClass.year} onChange={e => setEditingClass({...editingClass, year: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none">
                {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y.toString()}>{y}학년도</option>)}
              </select>

              <label className="block text-xs font-black text-slate-400">목표 수업일 수</label>
              <input type="number" value={editingClass.targetDays} onChange={e => setEditingClass({...editingClass, targetDays: parseInt(e.target.value)})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
            </div>
            <div className="flex gap-3"><button type="button" onClick={() => setEditingClass(null)} className="flex-1 py-5 bg-slate-100 font-black rounded-2xl">취소</button><button type="submit" className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-2xl">저장</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
