import { describe, expect, it } from 'vitest';
import {
  BU_CODES,
  BU_META,
  BU_NAMES,
  BU_SELECT_OPTIONS,
  getBuName,
  isBuCode,
} from '@/lib/business-units';

describe('business-units (사업부 단일 정의)', () => {
  it('운영 DB bu_code enum 7개를 정해진 순서로 가진다', () => {
    expect(BU_CODES).toEqual(['GRIGO', 'DEETZ', 'FLOW', 'REACT', 'MODOO', 'AST', 'HEAD']);
  });

  it('DEETZ 표시 이름은 "deetz 에이전시"다', () => {
    expect(BU_META.DEETZ.name).toBe('deetz 에이전시');
    expect(getBuName('DEETZ')).toBe('deetz 에이전시');
  });

  it('모든 코드에 이름·짧은 라벨·영문 라벨·색상이 있고, 메타에 여분 코드가 없다', () => {
    expect(Object.keys(BU_META).sort()).toEqual([...BU_CODES].sort());
    for (const code of BU_CODES) {
      const meta = BU_META[code];
      expect(meta.name).toBeTruthy();
      expect(meta.shortLabel).toBeTruthy();
      expect(meta.label).toBeTruthy();
      expect(meta.color.chip).toBeTruthy();
      expect(meta.color.bar).toBeTruthy();
      expect(meta.color.barBg).toBeTruthy();
    }
  });

  it('파생 맵과 선택지가 BU_CODES 순서를 따른다', () => {
    expect(Object.keys(BU_NAMES)).toEqual([...BU_CODES]);
    expect(BU_SELECT_OPTIONS.map((o) => o.value)).toEqual([...BU_CODES]);
  });

  it('모르는 값은 코드 그대로, 빈 값은 빈 문자열로 표시한다', () => {
    expect(isBuCode('GRIGO')).toBe(true);
    expect(isBuCode('XYZ')).toBe(false);
    expect(getBuName('XYZ')).toBe('XYZ');
    expect(getBuName(null)).toBe('');
  });
});
