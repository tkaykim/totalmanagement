'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, User, Building2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppUser {
  id: string;
  name: string;
  email?: string;
  position?: string;
  bu_code?: string;
}

interface Partner {
  id: number;
  display_name: string;
  entity_type: string;
  email?: string;
  phone?: string;
}

export interface Participant {
  type: 'user' | 'partner';
  id: string | number;
  name: string;
  email?: string;
  detail?: string;
}

interface ParticipantSelectorProps {
  users: AppUser[];
  partners: Partner[];
  selectedParticipants: Participant[];
  onChange: (participants: Participant[]) => void;
  disabled?: boolean;
}

export function ParticipantSelector({
  users,
  partners,
  selectedParticipants,
  onChange,
  disabled = false,
}: ParticipantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'user' | 'partner'>('user');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.position?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const filteredPartners = useMemo(() => {
    if (!searchQuery) return partners;
    const query = searchQuery.toLowerCase();
    return partners.filter(
      (p) =>
        p.display_name.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query)
    );
  }, [partners, searchQuery]);

  const isUserSelected = (userId: string) => {
    return selectedParticipants.some((p) => p.type === 'user' && p.id === userId);
  };

  const isPartnerSelected = (partnerId: number) => {
    return selectedParticipants.some((p) => p.type === 'partner' && p.id === partnerId);
  };

  const handleSelectUser = (user: AppUser) => {
    if (isUserSelected(user.id)) {
      onChange(selectedParticipants.filter((p) => !(p.type === 'user' && p.id === user.id)));
    } else {
      onChange([
        ...selectedParticipants,
        {
          type: 'user',
          id: user.id,
          name: user.name,
          email: user.email,
          detail: user.position || user.bu_code,
        },
      ]);
    }
  };

  const handleSelectPartner = (partner: Partner) => {
    if (isPartnerSelected(partner.id)) {
      onChange(selectedParticipants.filter((p) => !(p.type === 'partner' && p.id === partner.id)));
    } else {
      onChange([
        ...selectedParticipants,
        {
          type: 'partner',
          id: partner.id,
          name: partner.display_name,
          email: partner.email,
          detail: partner.entity_type,
        },
      ]);
    }
  };

  const handleRemoveParticipant = (participant: Participant) => {
    onChange(selectedParticipants.filter((p) => !(p.type === participant.type && p.id === participant.id)));
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        참여자
      </label>
      
      {selectedParticipants.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedParticipants.map((p) => (
            <span
              key={`${p.type}-${p.id}`}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                p.type === 'user' 
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
              )}
            >
              {p.type === 'user' ? (
                <User className="w-3 h-3" />
              ) : (
                <Building2 className="w-3 h-3" />
              )}
              {p.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveParticipant(p)}
                  className="ml-1 hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="relative">
          <div
            onClick={() => setIsOpen(true)}
            className={cn(
              'flex items-center gap-2 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 cursor-pointer',
              isOpen && 'ring-2 ring-blue-500'
            )}
          >
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              placeholder="이름 또는 이메일로 검색..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {isOpen && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {isOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
              <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveTab('user')}
                  className={cn(
                    'flex-1 px-4 py-2 text-sm font-medium transition',
                    activeTab === 'user'
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  )}
                >
                  <User className="w-4 h-4 inline mr-1" />
                  내부 사용자 ({filteredUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('partner')}
                  className={cn(
                    'flex-1 px-4 py-2 text-sm font-medium transition',
                    activeTab === 'partner'
                      ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-b-2 border-purple-500'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  )}
                >
                  <Building2 className="w-4 h-4 inline mr-1" />
                  외부 파트너 ({filteredPartners.length})
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto">
                {activeTab === 'user' ? (
                  filteredUsers.length === 0 ? (
                    <p className="p-4 text-sm text-center text-slate-500 dark:text-slate-400">
                      검색 결과가 없습니다.
                    </p>
                  ) : (
                    filteredUsers.map((user) => {
                      const selected = isUserSelected(user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          className={cn(
                            'w-full flex items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700',
                            selected && 'bg-blue-50 dark:bg-blue-900/20'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{user.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {user.position && `${user.position} · `}{user.email}
                              </p>
                            </div>
                          </div>
                          {selected && (
                            <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </button>
                      );
                    })
                  )
                ) : (
                  filteredPartners.length === 0 ? (
                    <p className="p-4 text-sm text-center text-slate-500 dark:text-slate-400">
                      검색 결과가 없습니다.
                    </p>
                  ) : (
                    filteredPartners.map((partner) => {
                      const selected = isPartnerSelected(partner.id);
                      return (
                        <button
                          key={partner.id}
                          type="button"
                          onClick={() => handleSelectPartner(partner)}
                          className={cn(
                            'w-full flex items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700',
                            selected && 'bg-purple-50 dark:bg-purple-900/20'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{partner.display_name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {partner.entity_type}{partner.email && ` · ${partner.email}`}
                              </p>
                            </div>
                          </div>
                          {selected && (
                            <Check className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          )}
                        </button>
                      );
                    })
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
