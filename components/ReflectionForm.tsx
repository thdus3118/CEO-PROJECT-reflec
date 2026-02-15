
import React, { useState, useEffect } from 'react';

interface ReflectionFormProps {
  initialData?: {
    attitudeRating: number;
    learnedContent: string;
    activities: string;
    collaboration: string;
  };
  onSubmit: (data: {
    attitudeRating: number;
    learnedContent: string;
    activities: string;
    collaboration: string;
  }) => void;
  isSubmitting: boolean;
  onCancel?: () => void;
}

const ReflectionForm: React.FC<ReflectionFormProps> = ({ initialData, onSubmit, isSubmitting, onCancel }) => {
  const [rating, setRating] = useState(initialData?.attitudeRating ?? 5);
  const [learned, setLearned] = useState(initialData?.learnedContent ?? '');
  const [activities, setActivities] = useState(initialData?.activities ?? '');
  const [collaboration, setCollaboration] = useState(initialData?.collaboration ?? '');

  // Reset form if initialData changes (e.g., entering edit mode)
  useEffect(() => {
    if (initialData) {
      setRating(initialData.attitudeRating);
      setLearned(initialData.learnedContent);
      setActivities(initialData.activities);
      setCollaboration(initialData.collaboration);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (learned.length < 20 || activities.length < 20 || collaboration.length < 20) {
      alert("모든 항목은 최소 20자 이상 입력해주세요.");
      return;
    }
    onSubmit({
      attitudeRating: rating,
      learnedContent: learned,
      activities: activities,
      collaboration: collaboration
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-semibold text-slate-700">오늘의 수업 태도 별점</label>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600 font-medium">수정 취소</button>
        )}
      </div>
      
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`text-3xl transition-transform active:scale-95 ${rating >= star ? 'text-amber-400' : 'text-slate-200'}`}
          >
            ★
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">오늘 학습한 내용 (최소 20자)</label>
        <textarea
          value={learned}
          onChange={(e) => setLearned(e.target.value)}
          className="w-full min-h-[100px] p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all"
          placeholder="오늘 배운 핵심 개념이나 내용을 적어보세요..."
          maxLength={500}
        />
        <p className="text-right text-xs text-slate-400">{learned.length}/500</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">오늘의 학습 활동 (최소 20자)</label>
        <textarea
          value={activities}
          onChange={(e) => setActivities(e.target.value)}
          className="w-full min-h-[100px] p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all"
          placeholder="어떤 활동을 했고, 본인의 역할은 무엇이었나요?"
          maxLength={500}
        />
        <p className="text-right text-xs text-slate-400">{activities.length}/500</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">협동 과정 성찰 (최소 20자)</label>
        <textarea
          value={collaboration}
          onChange={(e) => setCollaboration(e.target.value)}
          className="w-full min-h-[100px] p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all"
          placeholder="친구들과 어떻게 소통하고 협력했나요?"
          maxLength={500}
        />
        <p className="text-right text-xs text-slate-400">{collaboration.length}/500</p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-300 transition-all flex justify-center items-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
            {initialData ? '수정 내용 반영 중...' : '제출 중...'}
          </>
        ) : (
          initialData ? '성찰 수정하기' : '성찰 제출하기'
        )}
      </button>
    </form>
  );
};

export default ReflectionForm;
