import React, { useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, List, ListOrdered, Type, Heading1, Heading2, Heading3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleRichEditorProps {
  value?: string; // HTML content
  onChange?: (content: { html: string; text: string }) => void;
  placeholder?: string;
  className?: string;
}

export const SimpleRichEditor: React.FC<SimpleRichEditorProps> = ({
  value = '',
  onChange,
  placeholder = "Enter your content...",
  className = ""
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  // Initialize content
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      if (value && value !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (!editorRef.current || isUpdatingRef.current) return;
    
    isUpdatingRef.current = true;
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.textContent || '';
    
    onChange?.({ html, text });
    
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  }, [onChange]);

  // Format commands
  const formatText = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

    if (ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          formatText('bold');
          break;
        case 'i':
          e.preventDefault();
          formatText('italic');
          break;
      }
    }
  }, [formatText]);

  return (
    <div className={`border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50 ${className}`}>
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-700/50 bg-slate-900/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 hover:bg-slate-700/50"
          onClick={() => formatText('bold')}
        >
          <Bold size={14} />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 hover:bg-slate-700/50"
          onClick={() => formatText('italic')}
        >
          <Italic size={14} />
        </Button>

        <div className="w-px h-4 bg-slate-700/50 mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 hover:bg-slate-700/50"
          onClick={() => formatText('formatBlock', 'H1')}
        >
          <Heading1 size={14} />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 hover:bg-slate-700/50"
          onClick={() => formatText('formatBlock', 'H2')}
        >
          <Heading2 size={14} />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 hover:bg-slate-700/50"
          onClick={() => formatText('formatBlock', 'H3')}
        >
          <Heading3 size={14} />
        </Button>

        <div className="w-px h-4 bg-slate-700/50 mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 hover:bg-slate-700/50"
          onClick={() => formatText('insertUnorderedList')}
        >
          <List size={14} />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 hover:bg-slate-700/50"
          onClick={() => formatText('insertOrderedList')}
        >
          <ListOrdered size={14} />
        </Button>

        <div className="w-px h-4 bg-slate-700/50 mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 hover:bg-slate-700/50"
          onClick={() => formatText('formatBlock', 'P')}
        >
          <Type size={14} />
        </Button>
      </div>

      {/* Rich Text Editor */}
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[120px] max-h-[300px] overflow-y-auto p-3 text-slate-100 focus:outline-none"
        style={{
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap'
        }}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {/* Placeholder styling */}
      <style dangerouslySetInnerHTML={{
        __html: `
          [data-placeholder]:empty::before {
            content: attr(data-placeholder);
            color: #64748b;
            pointer-events: none;
            opacity: 0.6;
          }
          
          /* Rich text styling */
          [contenteditable] h1 {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0.5rem 0;
            color: #f1f5f9;
          }
          
          [contenteditable] h2 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0.5rem 0;
            color: #f1f5f9;
          }
          
          [contenteditable] h3 {
            font-size: 1.125rem;
            font-weight: 600;
            margin: 0.5rem 0;
            color: #f1f5f9;
          }
          
          [contenteditable] ul, [contenteditable] ol {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
          }
          
          [contenteditable] li {
            margin: 0.25rem 0;
          }
          
          [contenteditable] p {
            margin: 0.5rem 0;
          }
          
          [contenteditable] strong {
            font-weight: 700;
          }
          
          [contenteditable] em {
            font-style: italic;
          }
        `
      }} />
    </div>
  );
};