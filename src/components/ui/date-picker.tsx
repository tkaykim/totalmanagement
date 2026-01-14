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
  onChange: (date: string) => void;
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
      onChange(formattedDate);
      setOpen(false);
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
        onInteractOutside={(e) => {
          // 월/년 드롭다운 선택 시 Popover가 닫히지 않도록
          const target = e.target as HTMLElement;
          if (target.closest('[data-slot="calendar"]') || target.closest('.rdp')) {
            e.preventDefault();
          }
        }}
        onOpenAutoFocus={(e) => {
          // 포커스 이동 시 자동 닫힘 방지
          e.preventDefault();
        }}
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          captionLayout="dropdown"
          fromYear={2020}
          toYear={2030}
          locale={ko}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
