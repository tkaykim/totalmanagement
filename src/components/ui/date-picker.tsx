'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps {
  value?: string;
  /** 반환값이 false이면 선택 후에도 팝오버를 닫지 않음 (검증 실패 시 사용) */
  onChange: (date: string) => void | boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = '날짜 선택',
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = value ? new Date(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const result = onChange(formattedDate);
      if (result !== false) {
        setOpen(false);
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            'bg-white/60 dark:bg-slate-700/60 px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 h-auto',
            className
          )}
        >
          <CalendarIcon className="mr-1 h-3 w-3" />
          {value ? format(new Date(value), 'yyyy.MM.dd', { locale: ko }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          captionLayout="label"
          fromYear={2020}
          toYear={2030}
          locale={ko}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
