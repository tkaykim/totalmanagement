'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExclusiveArtist, ExclusiveArtistFormData, VISA_TYPES, GENDER_OPTIONS } from '../types';
import { useCreateExclusiveArtist, useUpdateExclusiveArtist, useRemoveExclusiveArtist } from '../hooks';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';

const formSchema = z.object({
  display_name: z.string().min(1, '활동명을 입력하세요'),
  name_ko: z.string().optional(),
  name_en: z.string().optional(),
  nationality: z.string().optional(),
  entity_type: z.enum(['person', 'team']),
  gender: z.string().optional(),
  visa_type: z.string().optional(),
  visa_start: z.string().optional(),
  visa_end: z.string().optional(),
  contract_start: z.string().optional(),
  contract_end: z.string().optional(),
  note: z.string().optional(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ExclusiveArtistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artist?: ExclusiveArtist | null;
  onSuccess?: () => void;
}

export function ExclusiveArtistModal({
  open,
  onOpenChange,
  artist,
  onSuccess,
}: ExclusiveArtistModalProps) {
  const { toast } = useToast();
  const createMutation = useCreateExclusiveArtist();
  const updateMutation = useUpdateExclusiveArtist();
  const removeMutation = useRemoveExclusiveArtist();

  const isEditing = !!artist;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      display_name: '',
      name_ko: '',
      name_en: '',
      nationality: '',
      entity_type: 'person',
      gender: '',
      visa_type: '',
      visa_start: '',
      visa_end: '',
      contract_start: '',
      contract_end: '',
      note: '',
      bank_name: '',
      account_number: '',
    },
  });

  useEffect(() => {
    if (artist) {
      form.reset({
        display_name: artist.display_name,
        name_ko: artist.name_ko || '',
        name_en: artist.name_en || '',
        nationality: artist.nationality || '',
        entity_type: artist.entity_type,
        gender: artist.metadata.gender || '',
        visa_type: artist.metadata.visa_type || '',
        visa_start: artist.metadata.visa_start || '',
        visa_end: artist.metadata.visa_end || '',
        contract_start: artist.metadata.contract_start || '',
        contract_end: artist.metadata.contract_end || '',
        note: artist.metadata.note || '',
        bank_name: artist.metadata.bank_name || '',
        account_number: artist.metadata.account_number || '',
      });
    } else {
      form.reset({
        display_name: '',
        name_ko: '',
        name_en: '',
        nationality: '',
        entity_type: 'person',
        gender: '',
        visa_type: '',
        visa_start: '',
        visa_end: '',
        contract_start: '',
        contract_end: '',
        note: '',
        bank_name: '',
        account_number: '',
      });
    }
  }, [artist, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const formData: ExclusiveArtistFormData = {
        display_name: values.display_name,
        name_ko: values.name_ko,
        name_en: values.name_en,
        nationality: values.nationality,
        entity_type: values.entity_type,
        category_ids: [],
        metadata: {
          gender: values.gender,
          visa_type: values.visa_type,
          visa_start: values.visa_start,
          visa_end: values.visa_end,
          contract_start: values.contract_start,
          contract_end: values.contract_end,
          note: values.note,
          bank_name: values.bank_name,
          account_number: values.account_number,
        },
      };

      if (isEditing && artist) {
        await updateMutation.mutateAsync({ id: artist.id, data: formData });
        toast({
          title: '수정 완료',
          description: '아티스트 정보가 수정되었습니다.',
        });
      } else {
        await createMutation.mutateAsync(formData);
        toast({
          title: '등록 완료',
          description: '새 전속 아티스트가 등록되었습니다.',
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.',
      });
    }
  };

  const handleRemove = async () => {
    if (!artist) return;
    
    const confirmed = window.confirm(
      `${artist.display_name}을(를) 전속 아티스트 목록에서 제거하시겠습니까?`
    );
    
    if (!confirmed) return;

    try {
      await removeMutation.mutateAsync(artist.id);
      toast({
        title: '제거 완료',
        description: '전속 아티스트 목록에서 제거되었습니다.',
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: error instanceof Error ? error.message : '제거 중 오류가 발생했습니다.',
      });
    }
  };

  const watchVisaType = form.watch('visa_type');
  const isKorean = watchVisaType === 'N/A (내국인)';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '전속 아티스트 수정' : '전속 아티스트 등록'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">기본 정보</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>활동명 *</FormLabel>
                      <FormControl>
                        <Input placeholder="예: Honey J" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name_ko"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>한국어 표기</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 허니제이" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="entity_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>유형</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="person">개인</SelectItem>
                          <SelectItem value="team">팀</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>성별</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GENDER_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>국적</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 한국" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 계약 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">계약 정보</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contract_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>계약 시작일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contract_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>계약 종료일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 비자 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">비자 정보</h3>
              
              <FormField
                control={form.control}
                name="visa_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비자 종류</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VISA_TYPES.map((visa) => (
                          <SelectItem key={visa.value} value={visa.value}>
                            {visa.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isKorean && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="visa_start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>비자 시작일</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="visa_end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>비자 만료일</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* 정산 정보 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">정산 정보</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>은행명</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 신한은행" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>계좌번호</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 110-XXX-XXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 메모 */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메모</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="특이사항, 연락처 등 추가 정보를 입력하세요" 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={removeMutation.isPending}
                  className="mr-auto"
                >
                  {removeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  제거
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? '수정' : '등록'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
