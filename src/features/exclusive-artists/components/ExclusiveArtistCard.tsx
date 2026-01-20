'use client';

import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Users, 
  Calendar, 
  Plane, 
  AlertTriangle,
  Edit,
  FileText
} from 'lucide-react';
import { ExclusiveArtist } from '../types';

interface ExclusiveArtistCardProps {
  artist: ExclusiveArtist;
  onEdit: (artist: ExclusiveArtist) => void;
}

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parsed = parseISO(dateStr);
  return isValid(parsed) ? parsed : null;
}

function getExpiryStatus(dateStr?: string): { status: 'ok' | 'warning' | 'danger' | 'expired'; daysLeft: number | null } {
  const date = parseDate(dateStr);
  if (!date) return { status: 'ok', daysLeft: null };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = differenceInDays(date, today);
  
  if (daysLeft < 0) return { status: 'expired', daysLeft };
  if (daysLeft <= 30) return { status: 'danger', daysLeft };
  if (daysLeft <= 90) return { status: 'warning', daysLeft };
  return { status: 'ok', daysLeft };
}

function formatDate(dateStr?: string): string {
  const date = parseDate(dateStr);
  if (!date) return '-';
  return format(date, 'yyyy.MM.dd', { locale: ko });
}

export function ExclusiveArtistCard({ artist, onEdit }: ExclusiveArtistCardProps) {
  const visaStatus = getExpiryStatus(artist.metadata.visa_end);
  const contractStatus = getExpiryStatus(artist.metadata.contract_end);
  
  const isKorean = artist.metadata.visa_type === 'N/A (내국인)' || 
                   artist.nationality === '한국' || 
                   artist.nationality === 'KOR';

  const statusColors = {
    ok: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    expired: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-violet-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-violet-100 dark:bg-violet-900">
              {artist.entity_type === 'team' ? (
                <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              ) : (
                <User className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                {artist.display_name}
              </CardTitle>
              {artist.name_ko && artist.name_ko !== artist.display_name && (
                <p className="text-sm text-muted-foreground">{artist.name_ko}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onEdit(artist)}>
            <Edit className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-1 mt-2">
          {artist.categories.map((cat, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {cat}
            </Badge>
          ))}
          {artist.nationality && (
            <Badge variant="outline" className="text-xs">
              {artist.nationality}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 계약 기간 */}
        <div className="flex items-start gap-3">
          <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">계약 기간</span>
              {contractStatus.daysLeft !== null && (
                <Badge className={statusColors[contractStatus.status]}>
                  {contractStatus.status === 'expired' 
                    ? '만료됨' 
                    : `D-${contractStatus.daysLeft}`}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(artist.metadata.contract_start)} ~ {formatDate(artist.metadata.contract_end)}
            </p>
            {contractStatus.status === 'danger' && (
              <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-xs">계약 갱신이 필요합니다</span>
              </div>
            )}
          </div>
        </div>

        {/* 비자 정보 - 외국인만 표시 */}
        {!isKorean && (
          <div className="flex items-start gap-3">
            <Plane className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">비자 정보</span>
                {visaStatus.daysLeft !== null && (
                  <Badge className={statusColors[visaStatus.status]}>
                    {visaStatus.status === 'expired' 
                      ? '만료됨' 
                      : `D-${visaStatus.daysLeft}`}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {artist.metadata.visa_type || '-'}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(artist.metadata.visa_start)} ~ {formatDate(artist.metadata.visa_end)}
              </p>
              {visaStatus.status === 'danger' && (
                <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-xs">비자 갱신이 필요합니다</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 소속 시작일 */}
        {artist.relation_start_date && (
          <div className="flex items-center gap-3 pt-2 border-t">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <span className="text-sm text-muted-foreground">소속 시작</span>
              <span className="text-sm ml-2">{formatDate(artist.relation_start_date)}</span>
            </div>
          </div>
        )}

        {/* 메모 */}
        {artist.metadata.note && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {artist.metadata.note}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
