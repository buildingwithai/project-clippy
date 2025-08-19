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

  // Initialize content with proper HTML sanitization
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      if (value && value !== editorRef.current.innerHTML) {
        // Sanitize HTML while preserving formatting
        const sanitizedHTML = sanitizeHTML(value);
        editorRef.current.innerHTML = sanitizedHTML;
      }
    }
  }, [value]);

  // HTML sanitization that preserves formatting
  const sanitizeHTML = (html: string): string => {
    // Create a temporary div to work with the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove potentially dangerous elements but keep formatting
    const forbiddenTags = ['script', 'style', 'object', 'embed', 'form', 'input', 'button'];
    forbiddenTags.forEach(tag => {
      const elements = tempDiv.querySelectorAll(tag);
      elements.forEach(el => el.remove());
    });
    
    // Clean up attributes but preserve essential formatting ones
    const allowedAttributes = ['style', 'href', 'title', 'alt', 'src'];
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(element => {
      const attrs = Array.from(element.attributes);
      attrs.forEach(attr => {
        if (!allowedAttributes.includes(attr.name.toLowerCase())) {
          element.removeAttribute(attr.name);
        }
      });
    });
    
    return tempDiv.innerHTML;
  };

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
        className="min-h-[120px] max-h-[300px] overflow-y-auto p-3 focus:outline-none overflow-x-hidden"
        style={{
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          color: '#f1f5f9 !important',
          backgroundColor: 'transparent'
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
          
          /* Global white text enforcement with maximum specificity */
          div[contenteditable] {
            color: #f1f5f9 !important;
          }
          div[contenteditable] *,
          div[contenteditable] *:before,
          div[contenteditable] *:after {
            color: #f1f5f9 !important;
            background-color: transparent !important;
          }
          div[contenteditable] h1, div[contenteditable] h2, div[contenteditable] h3, 
          div[contenteditable] h4, div[contenteditable] h5, div[contenteditable] h6 {
            color: #f1f5f9 !important;
            font-weight: bold !important;
            margin: 0.5em 0 !important;
          }
          div[contenteditable] p {
            color: #f1f5f9 !important;
            margin: 0.25em 0 !important;
          }
          div[contenteditable] ul, div[contenteditable] ol {
            color: #f1f5f9 !important;
            margin: 0.5em 0 !important;
            padding-left: 1.5em !important;
          }
          div[contenteditable] li {
            color: #f1f5f9 !important;
            margin: 0.1em 0 !important;
          }
          div[contenteditable] a {
            color: #60a5fa !important;
            text-decoration: underline !important;
          }
          div[contenteditable] a:hover {
            color: #93c5fd !important;
          }
          div[contenteditable] strong, div[contenteditable] b {
            color: #f1f5f9 !important;
            font-weight: bold !important;
          }
          div[contenteditable] em, div[contenteditable] i {
            color: #f1f5f9 !important;
            font-style: italic !important;
          }
          div[contenteditable] u {
            color: #f1f5f9 !important;
            text-decoration: underline !important;
          }
          div[contenteditable] code {
            color: #f1f5f9 !important;
            background-color: #374151 !important;
            padding: 0.2em 0.4em !important;
            border-radius: 0.25rem !important;
            font-family: monospace !important;
          }
          div[contenteditable] blockquote {
            color: #f1f5f9 !important;
            border-left: 4px solid #60a5fa !important;
            padding-left: 1em !important;
            margin: 0.5em 0 !important;
            font-style: italic !important;
          }
        `
      }} />
    </div>
  );
};