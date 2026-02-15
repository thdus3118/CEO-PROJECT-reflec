
import { User, Reflection, ClassInfo, UserRole } from './types';

const STORAGE_KEYS = {
  USERS: 'reflection_note_users_v2',
  REFLECTIONS: 'reflection_note_reflections_v2',
  CLASSES: 'reflection_note_classes_v2',
  ANALYSES: 'reflection_note_analyses_v2',
  CURRENT_USER: 'reflection_note_session_v2',
  LAST_ACTIVITY: 'reflection_note_last_activity'
};

export const DB = {
  getUsers: (): User[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
  setUsers: (users: User[]) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)),
  
  getReflections: (): Reflection[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.REFLECTIONS) || '[]'),
  setReflections: (data: Reflection[]) => localStorage.setItem(STORAGE_KEYS.REFLECTIONS, JSON.stringify(data)),
  
  getClasses: (): ClassInfo[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES) || '[]'),
  setClasses: (data: ClassInfo[]) => localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(data)),

  getAnalyses: (): Record<string, any> => JSON.parse(localStorage.getItem(STORAGE_KEYS.ANALYSES) || '{}'),
  setAnalysis: (key: string, result: any) => {
    const current = DB.getAnalyses();
    current[key] = { ...result, timestamp: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.ANALYSES, JSON.stringify(current));
  },

  getCurrentUser: (): User | null => JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null'),
  setCurrentUser: (user: User | null) => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    if (user) {
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
    } else {
      localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
    }
  },

  updateReflectionFeedback: (reflectionId: string, feedback: string) => {
    const reflections = DB.getReflections();
    const updated = reflections.map(r => r.id === reflectionId ? { ...r, teacherFeedback: feedback } : r);
    DB.setReflections(updated);
  },

  addTeacher: (teacherData: { name: string, loginId: string, passwordHash: string }) => {
    const users = DB.getUsers();
    const newTeacher: User = {
      id: crypto.randomUUID(),
      role: UserRole.TEACHER,
      name: teacherData.name,
      loginId: teacherData.loginId,
      passwordHash: teacherData.passwordHash,
      isFirstLogin: true, // 기획서: 최초 로그인 시 변경 강제
      isActive: true
    };
    DB.setUsers([...users, newTeacher]);
  },

  // 계정 비활성화 (삭제 대신)
  deactivateUser: (userId: string) => {
    const users = DB.getUsers();
    const updated = users.map(u => u.id === userId ? { ...u, isActive: false } : u);
    DB.setUsers(updated);
  },

  // 계정 재활성화
  reactivateUser: (userId: string) => {
    const users = DB.getUsers();
    const updated = users.map(u => u.id === userId ? { ...u, isActive: true } : u);
    DB.setUsers(updated);
  },

  resetUserPassword: (userId: string) => {
    const users = DB.getUsers();
    const updated = users.map(u => u.id === userId ? { ...u, passwordHash: '0000', isFirstLogin: true } : u);
    DB.setUsers(updated);
  },

  upsertStudent: (studentData: Partial<User>) => {
    const users = DB.getUsers();
    
    // 학번 중복 체크 (신규 등록 시 동일 학급 내)
    if (!studentData.id) {
      const isDuplicate = users.some(u => u.role === UserRole.STUDENT && u.classId === studentData.classId && u.studentId === studentData.studentId && u.isActive);
      if (isDuplicate) {
        throw new Error(`학번 ${studentData.studentId}이(가) 이미 존재합니다.`);
      }
    }

    if (studentData.id) {
      const updated = users.map(u => u.id === studentData.id ? { ...u, ...studentData } : u);
      DB.setUsers(updated);
    } else {
      const newStudent: User = {
        id: crypto.randomUUID(),
        role: UserRole.STUDENT,
        name: studentData.name || '',
        studentId: studentData.studentId || '',
        loginId: '',
        passwordHash: '0000',
        isFirstLogin: true,
        isActive: true,
        classId: studentData.classId
      };
      DB.setUsers([...users, newStudent]);
    }
  },

  bulkUpsertStudents: (students: { name: string, studentId: string, classId: string }[]) => {
    const currentUsers = DB.getUsers();
    const duplicates: string[] = [];
    
    const validStudents = students.filter(s => {
      const isDuplicate = currentUsers.some(u => u.role === UserRole.STUDENT && u.classId === s.classId && u.studentId === s.studentId && u.isActive);
      if (isDuplicate) duplicates.push(s.studentId);
      return !isDuplicate;
    });

    const newUsers = validStudents.map(s => ({
      id: crypto.randomUUID(),
      role: UserRole.STUDENT,
      name: s.name,
      studentId: s.studentId,
      loginId: '',
      passwordHash: '0000',
      isFirstLogin: true,
      isActive: true,
      classId: s.classId
    }));

    DB.setUsers([...currentUsers, ...newUsers]);
    return { count: newUsers.length, duplicates };
  },

  resetStudentPassword: (studentId: string) => {
    DB.resetUserPassword(studentId);
  },

  deleteClass: (classId: string) => {
    const classes = DB.getClasses().filter(c => c.id !== classId);
    DB.setClasses(classes);
    // 학급 삭제 시 소속 학생들은 학급 미지정 상태로 변경 (기획서: 데이터 보존)
    const users = DB.getUsers().map(u => u.classId === classId ? { ...u, classId: undefined } : u);
    DB.setUsers(users);
  },

  init: () => {
    const users = DB.getUsers();
    const hasAdmin = users.some(u => u.role === UserRole.ADMIN);
    const currentYear = new Date().getFullYear().toString();
    
    if (!hasAdmin) {
      const superAdmin: User = {
        id: 'super-admin-1',
        role: UserRole.ADMIN,
        name: '시스템 관리자',
        loginId: 'admin',
        passwordHash: '0000', 
        isFirstLogin: true, // 강제 변경 대상
        isActive: true
      };
      
      const teacher1: User = {
        id: 'teacher-sample-1',
        role: UserRole.TEACHER,
        name: '김선생님',
        loginId: 'teacher1',
        passwordHash: '0000',
        isFirstLogin: false,
        isActive: true
      };

      const defaultClass: ClassInfo = {
        id: 'class-1',
        name: '1학년 3반',
        year: currentYear,
        teacherId: teacher1.id,
        targetDays: 190
      };

      const sampleStudent: User = {
        id: 'student-sample-1',
        role: UserRole.STUDENT,
        name: '홍길동',
        studentId: '10301',
        loginId: '',
        passwordHash: '0000',
        isFirstLogin: true,
        isActive: true,
        classId: defaultClass.id
      };
      
      DB.setUsers([...users, superAdmin, teacher1, sampleStudent]);
      DB.setClasses([defaultClass]);
    }
  }
};
