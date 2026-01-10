'use client';

import { useState, useEffect } from 'react';
import { 
  Save, 
  Loader2, 
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { DailyWorkLog, WorkLogFormData } from '../types';

interface WorkLogFormProps {
  workLog: DailyWorkLog | null;
  onSave: (data: WorkLogFormData) => Promise<void>;
  isSaving?: boolean;
  selectedDate: string;
}

export function WorkLogForm({ workLog, onSave, isSaving, selectedDate }: WorkLogFormProps) {
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setSummary(workLog?.summary || '');
    setNotes(workLog?.notes || '');
    setTomorrowPlan(workLog?.tomorrow_plan || '');
    setHasChanges(false);
    setSaveSuccess(false);
  }, [workLog]);

  const handleChange = (field: 'summary' | 'notes' | 'tomorrowPlan', value: string) => {
    switch (field) {
      case 'summary':
        setSummary(value);
        break;
      case 'notes':
        setNotes(value);
        break;
      case 'tomorrowPlan':
        setTomorrowPlan(value);
        break;
    }
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      log_date: selectedDate,
      summary: summary || undefined,
      notes: notes || undefined,
      tomorrow_plan: tomorrowPlan || undefined,
    });
    setHasChanges(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 오늘 업무 요약 */}
      <div className="space-y-2">
        <Label htmlFor="summary">오늘 업무 요약</Label>
        <Textarea
          id="summary"
          value={summary}
          onChange={(e) => handleChange('summary', e.target.value)}
          placeholder="오늘 수행한 주요 업무를 요약해주세요..."
          className="min-h-[120px] resize-none"
        />
      </div>

      {/* 특이사항 / 메모 */}
      <div className="space-y-2">
        <Label htmlFor="notes">
          특이사항 / 메모
          <span className="text-muted-foreground font-normal ml-2">(선택)</span>
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="특이사항이나 기억해둘 내용을 메모해주세요..."
          className="min-h-[80px] resize-none"
        />
      </div>

      {/* 내일 할 일 */}
      <div className="space-y-2">
        <Label htmlFor="tomorrowPlan">
          내일 할 일
          <span className="text-muted-foreground font-normal ml-2">(선택)</span>
        </Label>
        <Textarea
          id="tomorrowPlan"
          value={tomorrowPlan}
          onChange={(e) => handleChange('tomorrowPlan', e.target.value)}
          placeholder="내일 계획한 업무가 있다면 작성해주세요..."
          className="min-h-[80px] resize-none"
        />
      </div>

      {/* 저장 버튼 */}
      <Button
        type="submit"
        disabled={isSaving || !hasChanges}
        className="w-full"
        variant={saveSuccess ? 'outline' : 'default'}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            저장 중...
          </>
        ) : saveSuccess ? (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
            저장 완료
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            {workLog ? '일지 수정하기' : '일지 저장하기'}
          </>
        )}
      </Button>

      {/* 마지막 수정 시간 */}
      {workLog && (
        <p className="text-center text-xs text-muted-foreground">
          마지막 저장: {new Date(workLog.updated_at).toLocaleString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      )}
    </form>
  );
}
