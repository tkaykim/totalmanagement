'use client';

import { useCallback, useState } from 'react';
import { GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

type ResizableDescriptionTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightPx?: number;
  maxHeightPx?: number;
  className?: string;
  textareaClassName?: string;
};

const DEFAULT_MIN = 72;
const DEFAULT_MAX = 420;

export function ResizableDescriptionTextarea({
  value,
  onChange,
  placeholder,
  minHeightPx = DEFAULT_MIN,
  maxHeightPx = DEFAULT_MAX,
  className,
  textareaClassName,
}: ResizableDescriptionTextareaProps) {
  const [heightPx, setHeightPx] = useState(minHeightPx);

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = heightPx;
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const dy = ev.clientY - startY;
        const next = Math.min(maxHeightPx, Math.max(minHeightPx, startH + dy));
        setHeightPx(next);
      };

      const onUp = (ev: PointerEvent) => {
        target.releasePointerCapture(ev.pointerId);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [heightPx, maxHeightPx, minHeightPx]
  );

  return (
    <div className={cn('relative rounded-lg', className)}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ height: heightPx, minHeight: minHeightPx, maxHeight: maxHeightPx }}
        className={cn(
          'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 px-3 py-2 pr-9 pb-7 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 resize-none overflow-y-auto',
          textareaClassName
        )}
      />
      <button
        type="button"
        aria-label="설명란 높이 조절"
        title="드래그하여 높이 조절"
        onPointerDown={handleResizePointerDown}
        className={cn(
          'absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-tl-md rounded-br-lg',
          'cursor-ns-resize text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
          'border-t border-l border-slate-200/80 bg-slate-100/90 dark:border-slate-600 dark:bg-slate-800/90',
          'touch-none select-none'
        )}
      >
        <GripHorizontal className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
