/**
 * TipTap-based rich text editor with ClippyContent integration
 * 
 * This component replaces SimpleRichEditor with a more powerful TipTap-based
 * editor that natively supports the ClippyContent semantic model
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Bold, Italic, List, ListOrdered, Quote, Code, Link as LinkIcon, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ClippyContent } from '@/utils/types';
import { parseHTMLToClippyContent } from '@/utils/block-parser';
import { renderClippyContentToHTML } from '@/utils/renderers/html-renderer';

interface TipTapEditorProps {
  value?: ClippyContent | string; // Can accept ClippyContent or HTML/text
  onChange?: (content: { clippyContent: ClippyContent; html: string; text: string }) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  readOnly?: boolean;
  autoFocus?: boolean;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter your content...",
  className = "",
  maxLength,
  readOnly = false,
  autoFocus = false
}) => {
  const isUpdatingRef = useRef(false);

  // Configure TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable some default extensions we'll configure separately
        bulletList: {
          HTMLAttributes: {
            class: 'tiptap-bullet-list',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'tiptap-ordered-list',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'tiptap-blockquote',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'tiptap-code-block',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'tiptap-code',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'tiptap-link',
        },
        validate: href => /^https?:\/\//.test(href) || /^mailto:/.test(href) || /^tel:/.test(href),
      }),
      Placeholder.configure({
        placeholder,
      }),
      ...(maxLength ? [CharacterCount.configure({ limit: maxLength })] : []),
    ],
    content: '',
    editable: !readOnly,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: `tiptap-editor prose prose-sm max-w-none focus:outline-none ${className}`,
      },
    },
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return;
      
      const html = editor.getHTML();
      const text = editor.getText();
      
      // Convert HTML to ClippyContent
      try {
        const clippyContent = parseHTMLToClippyContent(html);
        onChange?.({ clippyContent, html, text });
      } catch (error) {
        console.error('[TipTap Editor] Error parsing content:', error);
        // Fallback: create simple ClippyContent from text
        const fallbackContent: ClippyContent = {
          version: "1.0",
          blocks: text ? [{
            type: 'paragraph',
            id: `block-${Date.now()}`,
            content: [{
              type: 'text',
              text
            }]
          }] : [],
          metadata: {
            capturedAt: new Date().toISOString(),
            originalFormat: 'html'
          }
        };
        onChange?.({ clippyContent: fallbackContent, html, text });
      }
    },
  });

  // Handle value changes from parent
  useEffect(() => {
    if (!editor || isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    try {
      if (!value) {
        editor.commands.setContent('');
      } else if (typeof value === 'string') {
        // Handle string input (HTML or plain text)
        if (value.includes('<') && value.includes('>')) {
          editor.commands.setContent(value);
        } else {
          editor.commands.setContent(`<p>${value}</p>`);
        }
      } else {
        // Handle ClippyContent input
        const html = renderClippyContentToHTML(value);
        editor.commands.setContent(html);
      }
    } catch (error) {
      console.error('[TipTap Editor] Error setting content:', error);
      // Fallback to plain text
      const fallbackText = typeof value === 'string' ? value : 
                          value?.blocks?.map(block => 
                            block.type === 'paragraph' || block.type === 'heading' ? 
                            block.content.map(inline => inline.type === 'text' ? inline.text : '').join('') : ''
                          ).join('\n') || '';
      editor.commands.setContent(`<p>${fallbackText}</p>`);
    } finally {
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [editor, value]);

  // Toolbar actions
  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run();
  }, [editor]);

  const toggleCode = useCallback(() => {
    editor?.chain().focus().toggleCode().run();
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // Cancelled
    if (url === null) {
      return;
    }

    // Empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // Update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const setParagraph = useCallback(() => {
    editor?.chain().focus().setParagraph().run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="border border-slate-700 rounded-lg bg-slate-800/50 p-4">
        <div className="text-slate-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={`border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-700/50 bg-slate-900/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 px-2 hover:bg-slate-700/50 ${
            editor.isActive('bold') ? 'bg-slate-700/70 text-white' : ''
          }`}
          onClick={toggleBold}
          disabled={readOnly}
        >
          <Bold size={14} />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 px-2 hover:bg-slate-700/50 ${
            editor.isActive('italic') ? 'bg-slate-700/70 text-white' : ''
          }`}
          onClick={toggleItalic}
          disabled={readOnly}
        >
          <Italic size={14} />
        </Button>

        <div className="w-px h-4 bg-slate-700/50 mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 px-2 hover:bg-slate-700/50 ${
            editor.isActive('bulletList') ? 'bg-slate-700/70 text-white' : ''
          }`}
          onClick={toggleBulletList}
          disabled={readOnly}
        >
          <List size={14} />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 px-2 hover:bg-slate-700/50 ${
            editor.isActive('orderedList') ? 'bg-slate-700/70 text-white' : ''
          }`}
          onClick={toggleOrderedList}
          disabled={readOnly}
        >
          <ListOrdered size={14} />
        </Button>

        <div className="w-px h-4 bg-slate-700/50 mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 px-2 hover:bg-slate-700/50 ${
            editor.isActive('blockquote') ? 'bg-slate-700/70 text-white' : ''
          }`}
          onClick={toggleBlockquote}
          disabled={readOnly}
        >
          <Quote size={14} />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 px-2 hover:bg-slate-700/50 ${
            editor.isActive('code') ? 'bg-slate-700/70 text-white' : ''
          }`}
          onClick={toggleCode}
          disabled={readOnly}
        >
          <Code size={14} />
        </Button>

        <div className="w-px h-4 bg-slate-700/50 mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 px-2 hover:bg-slate-700/50 ${
            editor.isActive('link') ? 'bg-slate-700/70 text-white' : ''
          }`}
          onClick={setLink}
          disabled={readOnly}
        >
          <LinkIcon size={14} />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 hover:bg-slate-700/50"
          onClick={setParagraph}
          disabled={readOnly}
        >
          <Type size={14} />
        </Button>

        {/* Character count */}
        {maxLength && (
          <div className="ml-auto text-xs text-slate-400">
            {editor.storage.characterCount.characters()}/{maxLength}
          </div>
        )}
      </div>

      {/* Editor content */}
      <div className="min-h-[120px] max-h-[300px] overflow-y-auto">
        <EditorContent 
          editor={editor}
          className="tiptap-content"
        />
      </div>

      {/* Editor styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .tiptap-content .tiptap-editor {
            padding: 12px;
            color: #f1f5f9 !important;
            background: transparent;
            outline: none;
          }
          
          .tiptap-content .tiptap-editor p {
            margin: 0.25em 0;
            color: #f1f5f9 !important;
          }
          
          .tiptap-content .tiptap-editor p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #64748b;
            pointer-events: none;
            height: 0;
          }
          
          .tiptap-content .tiptap-editor h1, 
          .tiptap-content .tiptap-editor h2, 
          .tiptap-content .tiptap-editor h3,
          .tiptap-content .tiptap-editor h4,
          .tiptap-content .tiptap-editor h5,
          .tiptap-content .tiptap-editor h6 {
            color: #f1f5f9 !important;
            font-weight: bold;
            margin: 0.5em 0;
          }
          
          .tiptap-content .tiptap-editor h1 { font-size: 1.5em; }
          .tiptap-content .tiptap-editor h2 { font-size: 1.3em; }
          .tiptap-content .tiptap-editor h3 { font-size: 1.1em; }
          
          .tiptap-content .tiptap-bullet-list,
          .tiptap-content .tiptap-ordered-list {
            padding-left: 1.5em;
            margin: 0.5em 0;
          }
          
          .tiptap-content .tiptap-bullet-list li,
          .tiptap-content .tiptap-ordered-list li {
            color: #f1f5f9 !important;
            margin: 0.1em 0;
          }
          
          .tiptap-content .tiptap-blockquote {
            border-left: 4px solid #60a5fa;
            padding-left: 1em;
            margin: 0.5em 0;
            font-style: italic;
            color: #f1f5f9 !important;
          }
          
          .tiptap-content .tiptap-code-block {
            background: #374151;
            color: #f1f5f9 !important;
            padding: 0.75em;
            border-radius: 0.375rem;
            font-family: 'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace;
            margin: 0.5em 0;
            overflow-x: auto;
          }
          
          .tiptap-content .tiptap-code {
            background: #374151;
            color: #f1f5f9 !important;
            padding: 0.2em 0.4em;
            border-radius: 0.25rem;
            font-family: 'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace;
            font-size: 0.875em;
          }
          
          .tiptap-content .tiptap-link {
            color: #60a5fa !important;
            text-decoration: underline;
            cursor: pointer;
          }
          
          .tiptap-content .tiptap-link:hover {
            color: #93c5fd !important;
          }
          
          .tiptap-content .tiptap-editor strong,
          .tiptap-content .tiptap-editor b {
            color: #f1f5f9 !important;
            font-weight: bold;
          }
          
          .tiptap-content .tiptap-editor em,
          .tiptap-content .tiptap-editor i {
            color: #f1f5f9 !important;
            font-style: italic;
          }
          
          .tiptap-content .tiptap-editor u {
            color: #f1f5f9 !important;
            text-decoration: underline;
          }
          
          .tiptap-content .tiptap-editor s,
          .tiptap-content .tiptap-editor strike {
            color: #f1f5f9 !important;
            text-decoration: line-through;
          }
        `
      }} />
    </div>
  );
};