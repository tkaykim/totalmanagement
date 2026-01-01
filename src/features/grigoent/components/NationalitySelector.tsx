'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

// 자주 쓰는 국적 (우선순위)
const COMMON_NATIONALITIES = ['한국', '일본', '미국', '중국', '홍콩', '대만', '싱가포르', '태국'];

// 기타 국적 목록
const OTHER_NATIONALITIES = [
  '가나', '가봉', '가이아나', '감비아', '과테말라', '그레나다', '그리스', '기니', '기니비사우', '나미비아',
  '나우루', '나이지리아', '남수단', '남아프리카공화국', '네덜란드', '네팔', '노르웨이', '뉴질랜드', '니제르',
  '니카라과', '대한민국', '덴마크', '도미니카', '도미니카공화국', '독일', '동티모르', '라오스', '라이베리아',
  '라트비아', '러시아', '레바논', '레소토', '루마니아', '룩셈부르크', '르완다', '리비아', '리투아니아',
  '리히텐슈타인', '마다가스카르', '마셜제도', '마케도니아', '말라위', '말레이시아', '말리', '멕시코', '모나코',
  '모로코', '모리셔스', '모리타니', '모잠비크', '몬테네그로', '몰도바', '몰디브', '몰타', '몽골', '미국',
  '미얀마', '미크로네시아', '바누아투', '바레인', '바베이도스', '바하마', '방글라데시', '버뮤다', '베냉',
  '베네수엘라', '베트남', '벨기에', '벨라루스', '벨리즈', '보스니아헤르체고비나', '보츠와나', '볼리비아',
  '부룬디', '부르키나파소', '부탄', '불가리아', '브라질', '브루나이', '사모아', '사우디아라비아', '산마리노',
  '상투메프린시페', '세네갈', '세르비아', '세이셸', '세인트키츠네비스', '세인트루시아', '세인트빈센트그레나딘',
  '소말리아', '솔로몬제도', '수단', '수리남', '스리랑카', '스웨덴', '스위스', '스페인', '슬로바키아', '슬로베니아',
  '시리아', '시에라리온', '신트마르턴', '아르메니아', '아르헨티나', '아이슬란드', '아일랜드', '아제르바이잔',
  '아프가니스탄', '안도라', '알바니아', '알제리', '앙골라', '앤티가바부다', '에리트레아', '에스와티니', '에스토니아',
  '에콰도르', '에티오피아', '엘살바도르', '영국', '예멘', '오만', '오스트레일리아', '오스트리아', '온두라스', '요르단',
  '우간다', '우루과이', '우즈베키스탄', '우크라이나', '이라크', '이란', '이스라엘', '이집트', '이탈리아', '인도',
  '인도네시아', '자메이카', '잠비아', '적도기니', '조선민주주의인민공화국', '조지아', '중앙아프리카공화국', '지부티',
  '짐바브웨', '차드', '체코', '칠레', '카메룬', '카보베르데', '카자흐스탄', '카타르', '캄보디아', '캐나다', '케냐',
  '코모로', '코스타리카', '코트디부아르', '콜롬비아', '콩고공화국', '콩고민주공화국', '쿠바', '쿠웨이트', '크로아티아',
  '키르기스스탄', '키리바시', '키프로스', '타지키스탄', '탄자니아', '터키', '토고', '통가', '투르크메니스탄',
  '투발루', '튀니지', '트리니다드토바고', '파나마', '파라과이', '파키스탄', '파푸아뉴기니', '팔라우', '페루',
  '포르투갈', '폴란드', '프랑스', '피지', '핀란드', '필리핀', '헝가리',
];

// 전체 국적 목록 (자주 쓰는 국적이 맨 위에 오도록 정렬)
const ALL_NATIONALITIES = [...COMMON_NATIONALITIES, ...OTHER_NATIONALITIES.filter(n => !COMMON_NATIONALITIES.includes(n))];

export function NationalitySelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 검색 필터링 및 정렬 (자주 쓰는 국적 우선)
  const filteredNationalities = useMemo(() => {
    if (!searchQuery.trim()) {
      // 검색어가 없으면 자주 쓰는 국적 + 나머지 순서대로
      return ALL_NATIONALITIES;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = ALL_NATIONALITIES.filter((nat) => nat.toLowerCase().includes(query));
    
    // 필터링된 결과에서도 자주 쓰는 국적이 위에 오도록 정렬
    const commonFiltered = filtered.filter((nat) => COMMON_NATIONALITIES.includes(nat));
    const otherFiltered = filtered.filter((nat) => !COMMON_NATIONALITIES.includes(nat));
    
    return [...commonFiltered, ...otherFiltered];
  }, [searchQuery]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (nationality: string) => {
    onChange(nationality);
    setIsOpen(false);
    setSearchQuery('');
  };

  const selectedNationality = value || '';

  return (
    <div className="relative" ref={containerRef}>
      <label className="space-y-1.5 block">
        <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <div
          className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 cursor-pointer flex items-center justify-between"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className={selectedNationality ? '' : 'text-gray-500 dark:text-slate-400'}>
            {selectedNationality || '국적 선택'}
          </span>
          <ChevronDown
            size={16}
            className={`text-gray-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </label>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-slate-700">
            <input
              type="text"
              placeholder="국적 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filteredNationalities.length > 0 ? (
              filteredNationalities.map((nationality) => (
                <button
                  key={nationality}
                  type="button"
                  onClick={() => handleSelect(nationality)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                    selectedNationality === nationality
                      ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-bold'
                      : 'text-gray-900 dark:text-slate-100'
                  }`}
                >
                  {nationality}
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400 text-center">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



