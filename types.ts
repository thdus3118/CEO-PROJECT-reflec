
export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

export interface User {
  id: string;
  role: UserRole;
  name: string;
  loginId: string;
  studentId?: string;
  classId?: string;
  passwordHash: string;
  isFirstLogin: boolean;
  isActive: boolean; // 전입/전출 처리용
}

export interface ClassInfo {
  id: string;
  name: string;
  year: string;
  teacherId: string;
  targetDays: number; // 수업일 설정 (작성률 계산용)
}

export interface Reflection {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  attitudeRating: number;
  learnedContent: string;
  activities: string;
  collaboration: string;
  createdAt: string;
  updatedAt: string;
  aiFeedback?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  teacherFeedback?: string;
}
