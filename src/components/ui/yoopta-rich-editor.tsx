import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import YooptaEditor, { createYooptaEditor, YooptaContentValue } from '@yoopta/editor';

// Core plugins
import Paragraph from '@yoopta/paragraph';
import Blockquote from '@yoopta/blockquote';
import Code from '@yoopta/code';
import Headings from '@yoopta/headings';
import Lists from '@yoopta/lists';

// Marks (formatting)
import { Bold, Italic, CodeMark, Underline, Strike, Highlight } from '@yoopta/marks';

// Tools
import ActionMenuList, { DefaultActionMenuRender } from '@yoopta/action-menu-list';
import Toolbar, { DefaultToolbarRender } from '@yoopta/toolbar';

interface YooptaRichEditorProps {
  value?: string;
  onChange?: (content: { html: string; text: string }) => void;
  placeholder?: string;
  className?: string;
  initialHtml?: string;
}

export const YooptaRichEditor: React.FC<YooptaRichEditorProps> = ({
  value,
  onChange,
  placeholder = "Type your content here...",
  className = "",
  initialHtml
}) => {
  // Create editor instance
  const editor = useMemo(() => createYooptaEditor(), []);
  
  // Yoopta editor value state
  const [editorValue, setEditorValue] = useState<YooptaContentValue>();
  
  // Track if we're in initialization phase to prevent onChange from overwriting content
  const isInitializingRef = useRef(true);
  const [isInitializing, setIsInitializing] = useState(true);

  // Configure plugins
  const plugins = useMemo(() => {
    console.log('🔧 Creating Yoopta plugins...');
    const pluginList = [
      Paragraph.extend({
        options: {
          display: {
            title: 'Text',
            description: 'Just start typing with plain text.',
          },
          placeholder: placeholder,
        },
      }),
    Headings.HeadingOne.extend({
      options: {
        display: {
          title: 'Heading 1',
          description: 'Big section heading.',
        },
      },
    }),
    Headings.HeadingTwo.extend({
      options: {
        display: {
          title: 'Heading 2',
          description: 'Medium section heading.',
        },
      },
    }),
    Headings.HeadingThree.extend({
      options: {
        display: {
          title: 'Heading 3',
          description: 'Small section heading.',
        },
      },
    }),
    Lists.BulletedList.extend({
      options: {
        display: {
          title: 'Bulleted list',
          description: 'Create a simple bulleted list.',
        },
      },
    }),
    Lists.NumberedList.extend({
      options: {
        display: {
          title: 'Numbered list',
          description: 'Create a list with numbering.',
        },
      },
    }),
    Blockquote.extend({
      options: {
        display: {
          title: 'Quote',
          description: 'Capture a quote.',
        },
      },
    }),
    Code.extend({
      options: {
        display: {
          title: 'Code',
          description: 'Create a code snippet.',
        },
      },
    }),
    ];
    console.log('🔧 Created plugins:', pluginList.length, 'plugins loaded');
    return pluginList;
  }, [placeholder]);

  // Configure marks (text formatting)
  const marks = useMemo(() => [
    Bold,
    Italic,
    CodeMark,
    Underline,
    Strike,
    Highlight,
  ], []);

  // Configure tools
  const tools = useMemo(() => ({
    ActionMenu: {
      render: DefaultActionMenuRender,
      tool: ActionMenuList,
    },
    Toolbar: {
      render: DefaultToolbarRender,
      tool: Toolbar,
    },
  }), []);

  // Convert HTML to Yoopta format for initialization - SIMPLIFIED FOR TESTING
  const convertHtmlToYoopta = useCallback((html: string): YooptaContentValue => {
    console.log('🔧 Converting HTML to Yoopta:', html);
    
    if (!html || html.trim() === '' || html.trim() === '<p></p>') {
      console.log('🔧 No HTML content, returning empty');
      return {};
    }

    // TEST: Simple block creation (without forced remounting)
    console.log('🧪 Creating simple test block without key prop interference');
    const result: YooptaContentValue = {};
    const blockId = generateId();
    
    result[blockId] = {
      id: blockId,
      type: 'Paragraph',
      value: [
        {
          id: generateId(),
          type: 'paragraph',
          children: [{ text: 'TEST: Content without remounting' }]
        }
      ],
      meta: {
        align: 'left',
        depth: 0,
        order: 0
      }
    };

    console.log('🔧 Converted result:', result);
    return result;
  }, []);

  // Convert Yoopta value to HTML and text
  const convertYooptaToOutput = useCallback((yooptaValue: YooptaContentValue) => {
    if (!yooptaValue || Object.keys(yooptaValue).length === 0) {
      return { html: '', text: '' };
    }

    let html = '';
    let text = '';

    // Extract content from Yoopta structure
    Object.values(yooptaValue).forEach((block: any) => {
      if (block.value && Array.isArray(block.value)) {
        block.value.forEach((node: any) => {
          if (node.children && Array.isArray(node.children)) {
            const nodeText = node.children.map((child: any) => child.text || '').join('');
            text += nodeText + '\n';
            
            // Basic HTML conversion based on block type (Yoopta uses PascalCase!)
            switch (block.type) {
              case 'HeadingOne':
                html += `<h1>${nodeText}</h1>`;
                break;
              case 'HeadingTwo':
                html += `<h2>${nodeText}</h2>`;
                break;
              case 'HeadingThree':
                html += `<h3>${nodeText}</h3>`;
                break;
              case 'HeadingFour':
                html += `<h4>${nodeText}</h4>`;
                break;
              case 'Blockquote':
                html += `<blockquote>${nodeText}</blockquote>`;
                break;
              case 'Code':
                html += `<pre><code>${nodeText}</code></pre>`;
                break;
              case 'BulletedList':
                html += `<ul><li>${nodeText}</li></ul>`;
                break;
              case 'NumberedList':
                html += `<ol><li>${nodeText}</li></ol>`;
                break;
              case 'Paragraph':
                html += `<p>${nodeText}</p>`;
                break;
              default:
                console.log('🔧 Unknown block type:', block.type, 'defaulting to paragraph');
                html += `<p>${nodeText}</p>`;
            }
          }
        });
      }
    });

    if (!html.trim() && !text.trim()) {
      // Fallback: stringify raw content so caller sees some data
      const raw = JSON.stringify(yooptaValue);
      return { html: `<pre>${raw}</pre>`, text: raw };
    }
    return { 
      html: html.trim(), 
      text: text.trim() 
    };
  }, []);

  // Generate unique IDs for Yoopta blocks
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Initialize editor with content
  useEffect(() => {
    console.log('=== YooptaRichEditor useEffect START ===');
    console.log('Props - initialHtml:', initialHtml);
    console.log('Current editorValue:', editorValue);
    
    // Reset initialization flag when we get new content
    isInitializingRef.current = true;
    setIsInitializing(true);
    console.log('🔄 Reset initialization flag due to new props');
    
    // Check if we have actual content to work with
    const hasInitialHtml = initialHtml && initialHtml.trim();
    
    // Only initialize if we have initialHtml OR if it's explicitly undefined (new content)
    if (!hasInitialHtml && initialHtml === undefined) {
      console.log('⏳ Setting up empty editor for new content');
      // For completely new content, set up a minimal initialization timer
      setTimeout(() => {
        isInitializingRef.current = false;
        setIsInitializing(false);
        console.log('🎯 Enabling onChange for new content creation');
      }, 50);
      return;
    }
    
    // Use initialHtml if available
    let contentToUse = '';
    let source = '';
    
    if (hasInitialHtml) {
      console.log('✅ Using initialHtml:', initialHtml);
      contentToUse = initialHtml;
      source = 'initialHtml';
    }
    
    if (contentToUse) {
      console.log('🔄 Converting content from', source, ':', contentToUse);
      try {
        const yooptaValue = convertHtmlToYoopta(contentToUse);
        console.log('📝 Generated Yoopta value:', yooptaValue);
        console.log('📝 Number of blocks:', Object.keys(yooptaValue).length);
        
        // Always update when we have new content (comparing object keys for efficiency)
        const currentKeys = editorValue ? Object.keys(editorValue).sort().join(',') : '';
        const newKeys = Object.keys(yooptaValue).sort().join(',');
        
        if (currentKeys !== newKeys || !editorValue) {
          console.log('🔄 Setting editor value directly (no remounting):', yooptaValue);
          setEditorValue(yooptaValue);
          console.log('✅ Editor value updated successfully');
          // Simple delay for initialization
          setTimeout(() => {
            isInitializingRef.current = false;
            setIsInitializing(false);
            console.log('🎯 Initialization complete - onChange events now enabled');
          }, 100);
        } else {
          console.log('📋 Editor value unchanged - skipping update');
          isInitializingRef.current = false;
          setIsInitializing(false);
        }
      } catch (error) {
        console.error('❌ Error converting content:', error);
        // Fallback to empty editor
        const emptyId = generateId();
        const emptyParagraph = {
          [emptyId]: {
            id: emptyId,
            type: 'paragraph',
            value: [
              {
                id: generateId(),
                type: 'paragraph',
                children: [{ text: '' }],
                props: {
                  nodeType: 'block',
                },
              },
            ],
            meta: {
              order: 0,
              depth: 0,
            },
          },
        };
        setEditorValue(emptyParagraph);
        console.log('🔄 Fallback to empty editor due to error');
        setTimeout(() => {
          isInitializingRef.current = false;
          setIsInitializing(false);
          console.log('🎯 Error fallback initialization complete');
        }, 100);
      }
    } else {
      console.log('📝 No content - setting empty editor');
      // Set an empty paragraph to start with
      const emptyId = generateId();
      const emptyParagraph = {
        [emptyId]: {
          id: emptyId,
          type: 'paragraph',
          value: [
            {
              id: generateId(),
              type: 'paragraph',
              children: [{ text: '' }],
              props: {
                nodeType: 'block',
              },
            },
          ],
          meta: {
            order: 0,
            depth: 0,
          },
        },
      };
      setEditorValue(emptyParagraph);
      console.log('✅ Empty editor value set');
      setTimeout(() => {
        isInitializingRef.current = false;
        setIsInitializing(false);
        console.log('🎯 Empty editor initialization complete');
      }, 100);
    }
    console.log('=== YooptaRichEditor useEffect END ===');
  }, [initialHtml]) // Only depend on initialHtml, not value

  // Handle content changes
  const handleChange = useCallback((newValue: YooptaContentValue) => {
    console.log('🔧 YooptaEditor onChange - isInitializingRef:', isInitializingRef.current);
    console.log('🔧 YooptaEditor onChange - isInitializing state:', isInitializing);
    console.log('🔧 YooptaEditor onChange - raw value:', newValue);
    console.log('🔧 YooptaEditor onChange - block types:', Object.values(newValue).map((block: any) => block.type));
    console.log('🔧 YooptaEditor onChange - full block structure:', JSON.stringify(newValue, null, 2));
    
    // Don't update if we're still initializing (use ref for immediate access)
    if (isInitializingRef.current) {
      console.log('🚫 Ignoring onChange during initialization');
      return;
    }
    
    setEditorValue(newValue);

    if (onChange) {
      const output = convertYooptaToOutput(newValue);
      console.log('🔧 YooptaEditor onChange - converted output:', output);
      onChange(output);
    }
  }, [onChange, convertYooptaToOutput, isInitializing]);

  // Debug: Log what we're passing to YooptaEditor
  console.log('🔍 YooptaEditor render - editorValue:', editorValue);
  console.log('🔍 YooptaEditor render - editorValue keys:', editorValue ? Object.keys(editorValue) : 'undefined');

  return (
    <div className={`yoopta-rich-editor border border-slate-700 rounded-md overflow-hidden ${className}`}>
      <div className="min-h-[120px] max-h-[300px] overflow-y-auto bg-slate-900 text-slate-100">
        <YooptaEditor
          editor={editor}
          plugins={plugins}
          marks={marks}
          tools={tools}
          value={editorValue}
          onChange={handleChange}
          className="yoopta-editor-dark"
          style={{
            background: 'transparent',
            color: '#f1f5f9', // slate-100
            minHeight: '120px',
            padding: '12px',
          }}
        />
      </div>

      {/* Custom styles for dark theme */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .yoopta-editor-dark {
            --yoopta-editor-background: #0f172a;
            --yoopta-editor-text: #f1f5f9;
            --yoopta-editor-border: #334155;
            --yoopta-editor-hover: #1e293b;
            --yoopta-editor-selection: #0ea5e9;
          }
          
          .yoopta-editor-dark [data-yoopta-block] {
            color: #f1f5f9 !important;
          }
          
          .yoopta-editor-dark [data-yoopta-block]:empty:before {
            content: "${placeholder}";
            color: #64748b;
            pointer-events: none;
            opacity: 0.6;
          }
          
          .yoopta-editor-dark .yoopta-toolbar {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          
          .yoopta-editor-dark .yoopta-toolbar button {
            color: #f1f5f9;
            background: transparent;
            border: none;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          .yoopta-editor-dark .yoopta-toolbar button:hover {
            background: #334155;
          }
          
          /* Action Menu - Dark theme to match extension */
          [data-yoopta-action-menu-list],
          [data-action-menu-list],
          .yoopta-action-menu,
          [class*="action-menu"],
          [class*="ActionMenu"] {
            background: #1e293b !important;
            border: 1px solid #334155 !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2) !important;
            color: #ffffff !important;
            max-width: 180px !important;
          }
          
          /* All text in action menu should be white */
          [data-yoopta-action-menu-list] *,
          [data-action-menu-list] *,
          .yoopta-action-menu *,
          [class*="action-menu"] *,
          [class*="ActionMenu"] * {
            color: #ffffff !important;
          }
          
          /* Action menu items */
          [data-yoopta-action-menu-list] [role="option"],
          [data-yoopta-action-menu-list] button,
          [data-yoopta-action-menu-list] div,
          [role="option"],
          .yoopta-action-menu-item,
          [class*="action-menu-item"],
          [class*="ActionMenuItem"] {
            color: #ffffff !important;
            background: transparent !important;
            padding: 6px 8px !important;
            cursor: pointer !important;
            transition: background-color 0.2s !important;
            font-size: 12px !important;
          }
          
          /* Hover states */
          [data-yoopta-action-menu-list] [role="option"]:hover,
          [data-yoopta-action-menu-list] button:hover,
          [data-yoopta-action-menu-list] div:hover,
          [role="option"]:hover,
          .yoopta-action-menu-item:hover,
          [class*="action-menu-item"]:hover,
          [class*="ActionMenuItem"]:hover {
            background: #334155 !important;
            color: #ffffff !important;
          }
          
          /* Target any text elements specifically */
          [data-yoopta-action-menu-list] span,
          [data-yoopta-action-menu-list] p,
          [data-yoopta-action-menu-list] h1,
          [data-yoopta-action-menu-list] h2,
          [data-yoopta-action-menu-list] h3,
          [data-yoopta-action-menu-list] h4,
          [data-yoopta-action-menu-list] h5,
          [data-yoopta-action-menu-list] h6,
          [data-yoopta-action-menu-list] strong,
          [data-yoopta-action-menu-list] em,
          [data-yoopta-action-menu-list] small {
            color: #ffffff !important;
            font-size: 12px !important;
          }
          
          /* Description text */
          [data-yoopta-action-menu-list] .description,
          [data-yoopta-action-menu-list] small {
            color: #94a3b8 !important;
            font-size: 11px !important;
          }
        `
      }} />
    </div>
  );
};