'use client';

import { cn } from '@/lib/utils';

interface RichTextViewerProps {
  content: unknown;
  className?: string;
}

/**
 * 다양한 형식의 매뉴얼 콘텐츠를 깔끔한 HTML로 렌더링
 * - { html: string } → 새 TipTap HTML 형식
 * - { blocks: [...] } → 블록 기반 형식
 * - [...] → 레거시 배열 형식 ({text,type} 또는 {title,body})
 * - string → 단순 문자열
 */
export function RichTextViewer({ content, className }: RichTextViewerProps) {
  const html = contentToHtml(content);

  if (!html) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        등록된 내용이 없습니다.
      </p>
    );
  }

  return (
    <div
      className={cn('manual-viewer prose prose-sm dark:prose-invert max-w-none', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** 모든 콘텐츠 형식을 HTML로 변환 */
export function contentToHtml(content: unknown): string {
  if (!content) return '';

  // { html: string } → TipTap HTML 형식
  if (typeof content === 'object' && !Array.isArray(content)) {
    const c = content as Record<string, unknown>;

    if (typeof c.html === 'string') {
      return c.html;
    }

    // { blocks: [...] } → 블록 형식
    if (Array.isArray(c.blocks) && c.blocks.length > 0) {
      return blocksToHtml(c.blocks);
    }

    // { steps, attachments } → 레거시 steps 형식
    if (c.steps || c.attachments) {
      return legacyStepsToHtml(c);
    }
  }

  // [...] → 레거시 배열 형식
  if (Array.isArray(content)) {
    return legacyArrayToHtml(content);
  }

  // string → 단순 문자열
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (!trimmed) return '';
    return `<p>${escapeHtml(trimmed).replace(/\n/g, '<br>')}</p>`;
  }

  return '';
}

/* ── 블록 형식 → HTML ── */
function blocksToHtml(blocks: any[]): string {
  return blocks.map((block) => {
    switch (block.type) {
      case 'heading': {
        const level = block.level || 2;
        return `<h${level}>${escapeHtml(block.text || '')}</h${level}>`;
      }
      case 'text':
        return `<p>${escapeHtml(block.text || '').replace(/\n/g, '<br>')}</p>`;
      case 'image':
        return `<figure>
          <img src="${escapeHtml(block.url || '')}" alt="${escapeHtml(block.caption || '매뉴얼 이미지')}" />
          ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}
        </figure>`;
      case 'checklist':
        return `${block.title ? `<h4>${escapeHtml(block.title)}</h4>` : ''}
          <ul class="checklist">${(block.items || []).map((item: string) =>
            `<li>${escapeHtml(item)}</li>`
          ).join('')}</ul>`;
      case 'tip':
        return `<blockquote class="tip"><p>${escapeHtml(block.text || '').replace(/\n/g, '<br>')}</p></blockquote>`;
      case 'warning':
        return `<blockquote class="warning"><p>${escapeHtml(block.text || '').replace(/\n/g, '<br>')}</p></blockquote>`;
      default:
        return '';
    }
  }).join('\n');
}

/* ── 레거시 배열 형식 → HTML ── */
function legacyArrayToHtml(items: any[]): string {
  return items.map((item) => {
    if (typeof item === 'string') {
      return `<p>${escapeHtml(item).replace(/\n/g, '<br>')}</p>`;
    }
    if (typeof item !== 'object') return '';

    // {title, body} 형식 (id=4 비자 매뉴얼)
    if ('title' in item && 'body' in item) {
      return `<h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.body || '').replace(/\n/g, '<br>')}</p>`;
    }

    // {text, type} 형식 (id=10~17 매뉴얼)
    if ('text' in item && 'type' in item) {
      const text = item.text || '';
      switch (item.type) {
        case 'header':
          return `<h3>${escapeHtml(text)}</h3>`;
        case 'text':
          return `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
        case 'check':
          return `<ul class="checklist"><li>${escapeHtml(text)}</li></ul>`;
        case 'alert':
          return `<blockquote class="warning"><p>${escapeHtml(text)}</p></blockquote>`;
        case 'step':
          return `<ol class="step-list"><li>${escapeHtml(text)}</li></ol>`;
        case 'bullet':
          return `<ul><li>${escapeHtml(text)}</li></ul>`;
        case 'tip':
          return `<blockquote class="tip"><p>${escapeHtml(text)}</p></blockquote>`;
        default:
          return `<p>${escapeHtml(text)}</p>`;
      }
    }

    return '';
  }).join('\n');
}

/* ── 레거시 steps/attachments 형식 → HTML ── */
function legacyStepsToHtml(content: Record<string, unknown>): string {
  const parts: string[] = [];

  if (Array.isArray(content.steps)) {
    const sorted = [...content.steps].sort(
      (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
    );
    for (const step of sorted) {
      const s = step as any;
      parts.push(`<h3>${escapeHtml(s.title || '')}</h3>`);
      if (s.description) {
        parts.push(`<p>${escapeHtml(s.description).replace(/\n/g, '<br>')}</p>`);
      }
      if (Array.isArray(s.checklist) && s.checklist.length > 0) {
        parts.push(`<ul class="checklist">${s.checklist.map(
          (c: string) => `<li>${escapeHtml(c)}</li>`
        ).join('')}</ul>`);
      }
    }
  }

  if (Array.isArray(content.attachments)) {
    parts.push('<h4>첨부 자료</h4>');
    parts.push('<ul>');
    for (const att of content.attachments as any[]) {
      parts.push(`<li><a href="${escapeHtml(att.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(att.name)}</a></li>`);
    }
    parts.push('</ul>');
  }

  return parts.join('\n');
}

/* ── 유틸리티 ── */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
