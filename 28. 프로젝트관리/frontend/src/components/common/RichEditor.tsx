import { useRef, useEffect } from 'react';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichEditor({ value, onChange, placeholder, minHeight = 120 }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  function exec(command: string, arg?: string) {
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    handleInput();
  }

  function handleInput() {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }

  const btnClass = 'px-2 py-1 text-xs hover:bg-gray-200 rounded';

  return (
    <div className="border rounded overflow-hidden">
      {/* 툴바 */}
      <div className="flex items-center gap-0.5 border-b bg-gray-50 px-1 py-1 flex-wrap">
        <button type="button" onClick={() => exec('bold')}
          className={btnClass + ' font-bold'}>B</button>
        <button type="button" onClick={() => exec('italic')}
          className={btnClass + ' italic'}>I</button>
        <button type="button" onClick={() => exec('underline')}
          className={btnClass + ' underline'}>U</button>
        <button type="button" onClick={() => exec('strikeThrough')}
          className={btnClass + ' line-through'}>S</button>
        <span className="w-px h-4 bg-gray-300 mx-1" />
        <button type="button" onClick={() => exec('insertUnorderedList')}
          className={btnClass}>• 목록</button>
        <button type="button" onClick={() => exec('insertOrderedList')}
          className={btnClass}>1. 번호</button>
        <span className="w-px h-4 bg-gray-300 mx-1" />
        <button type="button" onClick={() => exec('formatBlock', '<h3>')}
          className={btnClass + ' font-semibold'}>제목</button>
        <button type="button" onClick={() => {
          const url = prompt('링크 URL 입력:');
          if (url) exec('createLink', url);
        }} className={btnClass + ' text-blue-500'}>🔗</button>
        <label className={btnClass + ' text-green-500 cursor-pointer'}>
          🖼
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                exec('insertImage', reader.result as string);
              };
              reader.readAsDataURL(file);
              e.target.value = '';
            }} />
        </label>
        <button type="button" onClick={() => exec('removeFormat')}
          className={btnClass + ' text-gray-400'}>지우기</button>
      </div>
      {/* 편집 영역 */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        className="px-3 py-2 text-sm outline-none prose-sm rich-editor-content"
        style={{ minHeight }}
        suppressContentEditableWarning
      />
    </div>
  );
}
