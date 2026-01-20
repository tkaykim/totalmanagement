'use client';

import { useState, useMemo } from 'react';
import { useExclusiveArtists } from '../hooks';
import { ExclusiveArtist } from '../types';
import { ExclusiveArtistModal } from './ExclusiveArtistModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Users, 
  AlertTriangle,
  Calendar,
  Plane,
  RefreshCw,
  Edit,
  User
} from 'lucide-react';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parsed = parseISO(dateStr);
  return isValid(parsed) ? parsed : null;
}

function formatDate(dateStr?: string): string {
  const date = parseDate(dateStr);
  if (!date) return '-';
  return format(date, 'yyyy.MM.dd', { locale: ko });
}

function getDaysUntilExpiry(dateStr?: string): number | null {
  const date = parseDate(dateStr);
  if (!date) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInDays(date, today);
}

function getExpiryBadge(daysLeft: number | null) {
  if (daysLeft === null) return null;
  
  if (daysLeft < 0) {
    return <Badge variant="destructive" className="text-xs">만료됨</Badge>;
  }
  if (daysLeft <= 30) {
    return <Badge variant="destructive" className="text-xs">D-{daysLeft}</Badge>;
  }
  if (daysLeft <= 90) {
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 text-xs">D-{daysLeft}</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">D-{daysLeft}</Badge>;
}

export function ExclusiveArtistsView() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'visa_expiring' | 'contract_expiring'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<ExclusiveArtist | null>(null);

  const { data: artists = [], isLoading, refetch } = useExclusiveArtists();

  const filteredArtists = useMemo(() => {
    let result = artists;

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((artist) =>
        artist.display_name.toLowerCase().includes(searchLower) ||
        artist.name_ko?.toLowerCase().includes(searchLower) ||
        artist.nationality?.toLowerCase().includes(searchLower)
      );
    }

    if (filter === 'visa_expiring') {
      result = result.filter((artist) => {
        const daysLeft = getDaysUntilExpiry(artist.metadata.visa_end);
        return daysLeft !== null && daysLeft <= 90;
      });
    } else if (filter === 'contract_expiring') {
      result = result.filter((artist) => {
        const daysLeft = getDaysUntilExpiry(artist.metadata.contract_end);
        return daysLeft !== null && daysLeft <= 90;
      });
    }

    return result;
  }, [artists, search, filter]);

  const stats = useMemo(() => {
    const total = artists.length;
    
    const visaExpiringSoon = artists.filter((a) => {
      const days = getDaysUntilExpiry(a.metadata.visa_end);
      return days !== null && days > 0 && days <= 90;
    }).length;
    
    const visaExpired = artists.filter((a) => {
      const days = getDaysUntilExpiry(a.metadata.visa_end);
      return days !== null && days <= 0;
    }).length;

    const contractExpiringSoon = artists.filter((a) => {
      const days = getDaysUntilExpiry(a.metadata.contract_end);
      return days !== null && days > 0 && days <= 90;
    }).length;

    const contractExpired = artists.filter((a) => {
      const days = getDaysUntilExpiry(a.metadata.contract_end);
      return days !== null && days <= 0;
    }).length;

    return { total, visaExpiringSoon, visaExpired, contractExpiringSoon, contractExpired };
  }, [artists]);

  const handleEditArtist = (artist: ExclusiveArtist) => {
    setSelectedArtist(artist);
    setIsModalOpen(true);
  };

  const handleAddArtist = () => {
    setSelectedArtist(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedArtist(null);
  };

  const handleSuccess = () => {
    refetch();
  };

  const isKorean = (artist: ExclusiveArtist) => {
    return artist.metadata.visa_type === 'N/A (내국인)' || 
           artist.nationality === '한국' || 
           artist.nationality === 'KOR';
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">전속 아티스트 관리</h2>
          <p className="text-muted-foreground">
            GRIGO Entertainment 소속 아티스트의 계약 및 비자 정보를 관리합니다.
          </p>
        </div>
        <Button onClick={handleAddArtist}>
          <Plus className="w-4 h-4 mr-2" />
          아티스트 등록
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-500" />
            <span className="text-sm text-muted-foreground">전체 아티스트</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.total}</p>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-muted-foreground">비자 만료 임박</span>
          </div>
          <p className="text-2xl font-bold mt-2">
            {stats.visaExpiringSoon}
            {stats.visaExpired > 0 && (
              <span className="text-sm text-red-500 ml-2">(+{stats.visaExpired} 만료)</span>
            )}
          </p>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-muted-foreground">계약 만료 임박</span>
          </div>
          <p className="text-2xl font-bold mt-2">
            {stats.contractExpiringSoon}
            {stats.contractExpired > 0 && (
              <span className="text-sm text-red-500 ml-2">(+{stats.contractExpired} 만료)</span>
            )}
          </p>
        </div>

        <div 
          className={cn(
            "p-4 rounded-lg border",
            (stats.visaExpired + stats.contractExpired > 0) 
              ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800' 
              : 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
          )}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn(
              "w-5 h-5",
              (stats.visaExpired + stats.contractExpired > 0) ? 'text-red-500' : 'text-green-500'
            )} />
            <span className="text-sm text-muted-foreground">주의 필요</span>
          </div>
          <p className="text-2xl font-bold mt-2">
            {stats.visaExpired + stats.contractExpired + stats.visaExpiringSoon + stats.contractExpiringSoon}건
          </p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="이름, 국적으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="visa_expiring">비자 만료 임박 (90일 이내)</SelectItem>
            <SelectItem value="contract_expiring">계약 만료 임박 (90일 이내)</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* 리스트 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredArtists.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">아티스트가 없습니다</h3>
          <p className="text-muted-foreground">
            {search || filter !== 'all' 
              ? '검색 조건에 맞는 아티스트가 없습니다.' 
              : '새 전속 아티스트를 등록해주세요.'}
          </p>
          {!search && filter === 'all' && (
            <Button onClick={handleAddArtist} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              아티스트 등록
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{filteredArtists.length}명</Badge>
            {filter !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setFilter('all')}>
                필터 해제
              </Button>
            )}
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>국적</TableHead>
                  <TableHead>계약 기간</TableHead>
                  <TableHead>계약 상태</TableHead>
                  <TableHead>비자 종류</TableHead>
                  <TableHead>비자 만료</TableHead>
                  <TableHead>비자 상태</TableHead>
                  <TableHead className="w-[80px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArtists.map((artist) => {
                  const contractDaysLeft = getDaysUntilExpiry(artist.metadata.contract_end);
                  const visaDaysLeft = getDaysUntilExpiry(artist.metadata.visa_end);
                  const artistIsKorean = isKorean(artist);
                  
                  return (
                    <TableRow 
                      key={artist.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        (contractDaysLeft !== null && contractDaysLeft <= 30) ||
                        (!artistIsKorean && visaDaysLeft !== null && visaDaysLeft <= 30)
                          ? "bg-red-50/50 dark:bg-red-950/20"
                          : ""
                      )}
                      onClick={() => handleEditArtist(artist)}
                    >
                      <TableCell>
                        <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                          {artist.entity_type === 'team' ? (
                            <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                          ) : (
                            <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{artist.display_name}</p>
                          {artist.name_ko && artist.name_ko !== artist.display_name && (
                            <p className="text-xs text-muted-foreground">{artist.name_ko}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {artist.entity_type === 'team' ? '팀' : '개인'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{artist.nationality || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span>{formatDate(artist.metadata.contract_start)}</span>
                          <span className="text-muted-foreground mx-1">~</span>
                          <span>{formatDate(artist.metadata.contract_end)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getExpiryBadge(contractDaysLeft)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {artistIsKorean ? 'N/A (내국인)' : (artist.metadata.visa_type || '-')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {artistIsKorean ? (
                          <span className="text-sm text-muted-foreground">-</span>
                        ) : (
                          <span className="text-sm">{formatDate(artist.metadata.visa_end)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {artistIsKorean ? (
                          <Badge variant="secondary" className="text-xs">해당없음</Badge>
                        ) : (
                          getExpiryBadge(visaDaysLeft)
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditArtist(artist);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* 모달 */}
      <ExclusiveArtistModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        artist={selectedArtist}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
