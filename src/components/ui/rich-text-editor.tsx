'use client';

import { useCallback, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote,
  Image as ImageIcon, Youtube as YoutubeIcon, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, Undo, Redo, Minus, Code,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = '내용을 입력하세요...',
  className,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Image.configure({
        HTMLAttributes: { class: 'manual-image' },
        allowBase64: false,
      }),
      Youtube.configure({
        HTMLAttributes: { class: 'manual-youtube' },
        width: 640,
        height: 360,
      }),
      Placeholder.configure({ placeholder }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'manual-link' },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        HTMLAttributes: { class: 'manual-highlight' },
      }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'rich-text-content outline-none min-h-[300px] px-5 py-4 prose prose-sm dark:prose-invert max-w-none focus:outline-none',
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          const file = files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) handleImageUpload(file);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/manuals/images', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('업로드 실패');
      const data = await res.json();
      editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
    } catch {
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }, [editor]);

  const handleImageClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleImageUpload]);

  const handleYoutubeEmbed = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('YouTube URL을 입력하세요:');
    if (url) {
      editor.commands.setYoutubeVideo({ src: url });
    }
  }, [editor]);

  const handleLinkAdd = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('URL을 입력하세요:', 'https://');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn('rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden', className)}>
      {/* 툴바 */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 flex flex-wrap items-center gap-0.5">
        {/* 실행취소 */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            tooltip="실행취소"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            tooltip="다시실행"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* 제목 */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            tooltip="대제목"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            tooltip="중제목"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            tooltip="소제목"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* 텍스트 스타일 */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            tooltip="굵게"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            tooltip="기울임"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            tooltip="밑줄"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            tooltip="취소선"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={editor.isActive('highlight')}
            tooltip="형광펜"
          >
            <Highlighter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            tooltip="인라인 코드"
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* 정렬 */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            tooltip="왼쪽 정렬"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            tooltip="가운데 정렬"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            tooltip="오른쪽 정렬"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* 리스트 & 인용 */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            tooltip="글머리 기호"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            tooltip="번호 목록"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            tooltip="인용"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            tooltip="구분선"
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        {/* 삽입 */}
        <ToolbarGroup>
          <ToolbarButton onClick={handleImageClick} tooltip="이미지 삽입" disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          </ToolbarButton>
          <ToolbarButton onClick={handleYoutubeEmbed} tooltip="유튜브 영상">
            <YoutubeIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={handleLinkAdd}
            active={editor.isActive('link')}
            tooltip="링크"
          >
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>
      </div>

      {/* 에디터 영역 */}
      <EditorContent editor={editor} />

      {/* 버블 메뉴 (텍스트 선택 시) - Temporarily disabled */}
      {/* {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 150 }}
          className="flex items-center gap-0.5 rounded-lg bg-slate-800 dark:bg-slate-700 shadow-xl px-1.5 py-1"
        >
          <BubbleButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
          >
            <Bold className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
          >
            <Italic className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={editor.isActive('highlight')}
          >
            <Highlighter className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            onClick={handleLinkAdd}
            active={editor.isActive('link')}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </BubbleButton>
        </BubbleMenu>
      )} */}

      {/* 숨김 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 업로드 중 표시 */}
      {uploading && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-slate-200 dark:border-slate-700">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
          <span className="text-xs text-blue-600 dark:text-blue-400">이미지 업로드 중...</span>
        </div>
      )}
    </div>
  );
}

/* ── 서브 컴포넌트 ── */

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  tooltip,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        active
          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
        disabled && 'opacity-30 pointer-events-none',
      )}
    >
      {children}
    </button>
  );
}

function BubbleButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'p-1 rounded transition-colors',
        active
          ? 'bg-white/20 text-white'
          : 'text-slate-300 hover:text-white hover:bg-white/10',
      )}
    >
      {children}
    </button>
  );
}
