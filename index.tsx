
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { User, UserRole } from './types';
import { DB } from './store';
import Layout from './components/Layout';
import LoginView from './views/LoginView';
import StudentDashboard from './views/StudentDashboard';
import TeacherDashboard from './views/TeacherDashboard';
import AdminDashboard from './views/AdminDashboard';

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    DB.init();
    const session = DB.getCurrentUser();
    if (session) {
      // 세션 타임아웃 체크 (2시간)
      const lastActivity = localStorage.getItem('reflection_note_last_activity');
      if (lastActivity) {
        const diff = Date.now() - parseInt(lastActivity);
        if (diff > 2 * 60 * 60 * 1000) {
          alert("세션이 만료되어 자동 로그아웃되었습니다.");
          handleLogout();
          setInitialized(true);
          return;
        }
      }

      const allUsers = DB.getUsers();
      const latestUser = allUsers.find(u => u.id === session.id && u.isActive);
      if (latestUser) {
        setUser(latestUser);
        DB.setCurrentUser(latestUser);
      } else {
        setUser(null);
        DB.setCurrentUser(null);
      }
    }
    setInitialized(true);

    // 활동 감지 (세션 연장용)
    const activityHandler = () => {
      if (DB.getCurrentUser()) {
        localStorage.setItem('reflection_note_last_activity', Date.now().toString());
      }
    };
    window.addEventListener('mousedown', activityHandler);
    window.addEventListener('keydown', activityHandler);

    // 주기적 세션 체크
    const interval = setInterval(() => {
      const last = localStorage.getItem('reflection_note_last_activity');
      if (last && DB.getCurrentUser()) {
        if (Date.now() - parseInt(last) > 2 * 60 * 60 * 1000) {
          alert("세션이 만료되었습니다.");
          handleLogout();
        }
      }
    }, 60000);

    return () => {
      window.removeEventListener('mousedown', activityHandler);
      window.removeEventListener('keydown', activityHandler);
      clearInterval(interval);
    };
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    DB.setCurrentUser(u);
  };

  const handleLogout = () => {
    setUser(null);
    DB.setCurrentUser(null);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    DB.setCurrentUser(updatedUser);
  };

  if (!initialized) return null;

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  const renderDashboard = () => {
    // 최초 로그인 시 비밀번호 변경 강제 (StudentDashboard/TeacherDashboard/AdminDashboard 내에서 각각 처리하거나 여기서 래핑)
    // 각 대시보드 내부에 settings 탭이 있으므로, 하위 컴포넌트에서 isFirstLogin일 때 UI를 제한하도록 유도
    switch (user.role) {
      case UserRole.ADMIN:
        return <AdminDashboard user={user} onUpdateUser={handleUpdateUser} />;
      case UserRole.TEACHER:
        return <TeacherDashboard user={user} onUpdateUser={handleUpdateUser} />;
      case UserRole.STUDENT:
        return <StudentDashboard user={user} onUpdateUser={handleUpdateUser} />;
      default:
        return <div>권한 오류</div>;
    }
  };

  return (
    <Layout user={user} onLogout={handleLogout}>
      {renderDashboard()}
    </Layout>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
