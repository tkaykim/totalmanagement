/** 매뉴얼 콘텐츠 블록 타입 */
export type ManualBlockType = 'heading' | 'text' | 'image' | 'checklist' | 'tip' | 'warning';

export interface HeadingBlock {
  type: 'heading';
  text: string;
  level: 1 | 2 | 3;
}

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ImageBlock {
  type: 'image';
  url: string;
  caption?: string;
}

export interface ChecklistBlock {
  type: 'checklist';
  title?: string;
  items: string[];
}

export interface TipBlock {
  type: 'tip';
  text: string;
}

export interface WarningBlock {
  type: 'warning';
  text: string;
}

export type ManualContentBlock =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | ChecklistBlock
  | TipBlock
  | WarningBlock;

/** 매뉴얼 콘텐츠 구조 (JSONB에 저장) */
export interface ManualContent {
  blocks?: ManualContentBlock[];
  html?: string;
}

/** 레거시 콘텐츠 형식 (기존 steps/attachments 형식) */
export interface LegacyManualContent {
  steps?: Array<{
    title: string;
    description?: string;
    order?: number;
    checklist?: string[];
  }>;
  attachments?: Array<{
    name: string;
    url: string;
  }>;
}
