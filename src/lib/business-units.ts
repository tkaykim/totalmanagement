/**
 * 사업부(BU) 목록의 단일 정의.
 *
 * 운영 DB enum `bu_code`의 7개 값과 화면 표기(이름·짧은 라벨·영문 라벨·색상)를 여기 한 곳에 둔다.
 * 탭·필터·선택지·라벨 맵·근태·휴가·예약·매뉴얼·할일 템플릿·거래처·푸시 테스트 화면은 모두 이 파일을 쓴다.
 * 사업부 목록을 다른 파일에 새로 하드코딩하지 않는다.
 *
 * 특정 사업부만 허용하는 업무 규칙(예: 전속 아티스트는 GRIGO·HEAD만)은 목록이 아니라 규칙이므로 각자 자리에 둔다.
 */

/** 운영 DB `bu_code` enum 값. 순서가 탭·선택지의 표시 순서다. */
export const BU_CODES = ['GRIGO', 'DEETZ', 'FLOW', 'REACT', 'MODOO', 'AST', 'HEAD'] as const;

export type BuCode = (typeof BU_CODES)[number];

export type BuColor = {
  /** 칩·배지(라이트·다크 배경, 글자, 테두리) */
  chip: string;
  /** 진행 막대 등 진한 단색 */
  bar: string;
  /** 연한 배경 + 테두리 */
  barBg: string;
};

export type BuMeta = {
  /** 한국어 표시 이름 */
  name: string;
  /** 좁은 자리용 짧은 라벨 */
  shortLabel: string;
  /** 영문 브랜드 라벨 */
  label: string;
  color: BuColor;
};

export const BU_META: Record<BuCode, BuMeta> = {
  GRIGO: {
    name: '그리고 엔터',
    shortLabel: '그리고',
    label: 'GRIGO',
    color: {
      chip: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      bar: 'bg-blue-500',
      barBg: 'bg-blue-500/10 border-blue-500/20',
    },
  },
  DEETZ: {
    name: 'deetz 에이전시',
    shortLabel: 'deetz',
    label: 'DEETZ',
    color: {
      chip: 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      bar: 'bg-teal-500',
      barBg: 'bg-teal-500/10 border-teal-500/20',
    },
  },
  FLOW: {
    name: '플로우메이커',
    shortLabel: '플로우',
    label: 'FLOWMAKER',
    color: {
      chip: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      bar: 'bg-indigo-500',
      barBg: 'bg-indigo-500/10 border-indigo-500/20',
    },
  },
  REACT: {
    name: '리액트 스튜디오',
    shortLabel: '리액트',
    label: 'REACT STUDIO',
    color: {
      chip: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      bar: 'bg-purple-500',
      barBg: 'bg-purple-500/10 border-purple-500/20',
    },
  },
  MODOO: {
    name: '모두굿즈',
    shortLabel: '모두',
    label: 'MODOO',
    color: {
      chip: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      bar: 'bg-amber-500',
      barBg: 'bg-amber-500/10 border-amber-500/20',
    },
  },
  AST: {
    name: '아스트 컴퍼니',
    shortLabel: 'AST',
    label: 'AST',
    color: {
      chip: 'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
      bar: 'bg-pink-500',
      barBg: 'bg-pink-500/10 border-pink-500/20',
    },
  },
  HEAD: {
    name: '본사',
    shortLabel: '본사',
    label: 'HEAD',
    color: {
      chip: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      bar: 'bg-slate-500',
      barBg: 'bg-slate-500/10 border-slate-500/20',
    },
  },
};

/** 값이 운영 DB `bu_code` enum 값인지 확인한다. */
export function isBuCode(value: unknown): value is BuCode {
  return typeof value === 'string' && (BU_CODES as readonly string[]).includes(value);
}

/** 사업부 표시 이름. 모르는 값이면 그 값을 그대로, 비어 있으면 빈 문자열을 돌려준다. */
export function getBuName(code: string | null | undefined): string {
  if (!code) return '';
  return isBuCode(code) ? BU_META[code].name : code;
}

/** 사업부 짧은 라벨. 모르는 값이면 그 값을 그대로 돌려준다. */
export function getBuShortLabel(code: string | null | undefined): string {
  if (!code) return '';
  return isBuCode(code) ? BU_META[code].shortLabel : code;
}

function mapBu<T>(pick: (meta: BuMeta, code: BuCode) => T): Record<BuCode, T> {
  return Object.fromEntries(BU_CODES.map((code) => [code, pick(BU_META[code], code)])) as Record<BuCode, T>;
}

/** 코드 → 한국어 이름 (BU_CODES 순서) */
export const BU_NAMES: Record<BuCode, string> = mapBu((m) => m.name);
/** 코드 → 영문 라벨 */
export const BU_ENGLISH_LABELS: Record<BuCode, string> = mapBu((m) => m.label);
/** 코드 → 칩 색상 클래스 */
export const BU_CHIP_CLASSES: Record<BuCode, string> = mapBu((m) => m.color.chip);

/** 선택지(select·필터)용 `{ value, label }` 목록 (BU_CODES 순서) */
export const BU_SELECT_OPTIONS: ReadonlyArray<{ value: BuCode; label: string }> = BU_CODES.map((code) => ({
  value: code,
  label: BU_META[code].name,
}));
