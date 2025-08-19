import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Heading3, Heading4, Type } from 'lucide-react';
import { Button } from './button';
import { CustomTooltip } from './custom-tooltip';

interface RichTextEditorProps {
  value?: string;
  onChange?: (content: { html: string; text: string }) => void;
  placeholder?: string;
  className?: string;
  initialHtml?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Type your content here...",
  className = "",
  initialHtml
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);

  // Track if we're updating from external source to prevent cursor jumping
  const [isExternalUpdate, setIsExternalUpdate] = useState(false);

  // Handle content changes with debouncing
  const handleInput = useCallback(() => {
    if (editorRef.current && onChange && !isExternalUpdate) {
      const html = editorRef.current.innerHTML;
      const text = editorRef.current.textContent || '';
      console.log('Rich Editor Content Change:', { html, text }); // Debug log
      onChange({ html, text });
    }
  }, [onChange, isExternalUpdate]);

  // Debounced version for frequent events
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const debouncedHandleInput = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(handleInput, 100);
  }, [handleInput]);

  // Save and restore cursor position
  const saveCursorPosition = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      return {
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset
      };
    }
    return null;
  }, []);

  const restoreCursorPosition = useCallback((savedPosition: any) => {
    if (savedPosition && editorRef.current) {
      try {
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.setStart(savedPosition.startContainer, savedPosition.startOffset);
          range.setEnd(savedPosition.endContainer, savedPosition.endOffset);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch (error) {
        // If cursor restoration fails, just place cursor at end
        const selection = window.getSelection();
        if (selection && editorRef.current) {
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  }, []);

  // Initialize editor content - only on mount or when initialHtml changes
  useEffect(() => {
    if (editorRef.current && initialHtml && initialHtml.trim()) {
      setIsExternalUpdate(true);
      editorRef.current.innerHTML = initialHtml;
      // Don't trigger handleInput here as it would cause infinite loops
      setTimeout(() => setIsExternalUpdate(false), 10);
    }
  }, [initialHtml]);

  // Handle plain text value (for backward compatibility) - only on initial load
  useEffect(() => {
    if (editorRef.current && value && !initialHtml && editorRef.current.innerHTML === '') {
      setIsExternalUpdate(true);
      // Convert plain text to HTML with line breaks
      const htmlContent = value.replace(/\n/g, '<br>');
      editorRef.current.innerHTML = htmlContent;
      setTimeout(() => setIsExternalUpdate(false), 10);
    }
  }, [value, initialHtml]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Execute formatting commands
  const execCommand = useCallback((command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      
      // Save cursor position before command
      const savedPosition = saveCursorPosition();
      
      // Execute the command
      const success = document.execCommand(command, false, value);
      
      // Force update the content and restore cursor if needed
      setTimeout(() => {
        handleInput();
        // Only restore position for certain commands that might move cursor
        if (['formatBlock'].includes(command) && savedPosition) {
          restoreCursorPosition(savedPosition);
        }
      }, 10);
      
      return success;
    }
    return false;
  }, [handleInput, saveCursorPosition, restoreCursorPosition]);

  // Format text (bold, italic, underline) using DOM manipulation
  const formatText = useCallback((format: 'bold' | 'italic' | 'underline') => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const savedPosition = saveCursorPosition();

    if (range.collapsed) {
      // Just cursor position - toggle format for next typing
      editorRef.current.focus();
      document.execCommand(format, false);
      return;
    }

    // Get selected content
    const selectedContent = range.extractContents();
    const span = document.createElement('span');
    span.appendChild(selectedContent);

    // Check if selection is already formatted
    const isAlreadyFormatted = checkFormatInContent(span, format);

    if (isAlreadyFormatted) {
      // Remove formatting
      removeFormatFromContent(span, format);
    } else {
      // Apply formatting
      applyFormatToContent(span, format);
    }

    // Insert back the modified content
    range.insertNode(span);
    
    // Clean up the span wrapper
    const parent = span.parentNode;
    while (span.firstChild) {
      parent?.insertBefore(span.firstChild, span);
    }
    parent?.removeChild(span);

    // Restore selection
    setTimeout(() => {
      handleInput();
      if (savedPosition) {
        restoreCursorPosition(savedPosition);
      }
    }, 10);
  }, [saveCursorPosition, restoreCursorPosition, handleInput]);

  // Check if content has specific formatting
  const checkFormatInContent = (element: Element, format: string): boolean => {
    const tagMap = {
      'bold': ['STRONG', 'B'],
      'italic': ['EM', 'I'], 
      'underline': ['U']
    };

    const tags = tagMap[format as keyof typeof tagMap] || [];
    
    // Check if the element itself has the format
    if (tags.includes(element.tagName)) return true;
    
    // Check all text content nodes
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
    );

    let hasFormat = false;
    let hasText = false;
    
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        hasText = true;
        // Check if this text node is inside a format tag
        let parent = node.parentElement;
        let foundFormat = false;
        while (parent && parent !== element) {
          if (tags.includes(parent.tagName)) {
            foundFormat = true;
            break;
          }
          parent = parent.parentElement;
        }
        if (foundFormat) {
          hasFormat = true;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as Element;
        if (tags.includes(elem.tagName)) {
          hasFormat = true;
        }
      }
      node = walker.nextNode();
    }

    return hasText && hasFormat;
  };

  // Remove formatting from content
  const removeFormatFromContent = (element: Element, format: string) => {
    const tagMap = {
      'bold': ['STRONG', 'B'],
      'italic': ['EM', 'I'],
      'underline': ['U']
    };

    const tags = tagMap[format as keyof typeof tagMap] || [];
    
    tags.forEach(tagName => {
      const elements = element.querySelectorAll(tagName.toLowerCase());
      elements.forEach(elem => {
        const parent = elem.parentNode;
        while (elem.firstChild) {
          parent?.insertBefore(elem.firstChild, elem);
        }
        parent?.removeChild(elem);
      });
    });
  };

  // Apply formatting to content
  const applyFormatToContent = (element: Element, format: string) => {
    const tagMap = {
      'bold': 'strong',
      'italic': 'em',
      'underline': 'u'
    };

    const tagName = tagMap[format as keyof typeof tagMap];
    if (!tagName) return;

    // Wrap all text content in format tags
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT
    );

    const textNodes: Text[] = [];
    let node = walker.nextNode() as Text;
    while (node) {
      if (node.textContent?.trim()) {
        textNodes.push(node);
      }
      node = walker.nextNode() as Text;
    }

    textNodes.forEach(textNode => {
      const formatElement = document.createElement(tagName);
      formatElement.textContent = textNode.textContent || '';
      textNode.parentNode?.replaceChild(formatElement, textNode);
    });
  };

  // Get selected range or cursor position
  const getSelectionRange = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      return selection.getRangeAt(0);
    }
    return null;
  }, []);

  // Get selected content as elements
  const getSelectedElements = useCallback(() => {
    const range = getSelectionRange();
    if (!range || !editorRef.current) return [];

    const elements: Element[] = [];
    
    // If selection is collapsed (just cursor), get the current block element
    if (range.collapsed) {
      let element: Node | null = range.startContainer;
      while (element && element !== editorRef.current) {
        if (element.nodeType === Node.ELEMENT_NODE && element !== editorRef.current) {
          const elementAsElement = element as Element;
          // Find the nearest block element
          if (elementAsElement.tagName && elementAsElement.tagName.match(/^(P|DIV|H[1-6]|LI)$/)) {
            elements.push(elementAsElement);
            break;
          }
        }
        element = element.parentNode;
      }
      
      // If no block element found, create a paragraph
      if (elements.length === 0) {
        const paragraph = document.createElement('p');
        paragraph.innerHTML = '<br>'; // Empty paragraph
        editorRef.current.appendChild(paragraph);
        elements.push(paragraph);
        
        // Move cursor to the new paragraph
        const selection = window.getSelection();
        if (selection) {
          const newRange = document.createRange();
          newRange.setStart(paragraph, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    } else {
      // For text selections, find all block elements that contain selected text
      const startContainer = range.startContainer;
      const endContainer = range.endContainer;
      
      // Find start and end block elements
      let startElement = startContainer.nodeType === Node.ELEMENT_NODE 
        ? startContainer as Element 
        : startContainer.parentElement;
      let endElement = endContainer.nodeType === Node.ELEMENT_NODE 
        ? endContainer as Element 
        : endContainer.parentElement;
      
      // Find nearest block elements
      while (startElement && !startElement.tagName?.match(/^(P|DIV|H[1-6]|LI)$/)) {
        startElement = startElement.parentElement;
      }
      while (endElement && !endElement.tagName?.match(/^(P|DIV|H[1-6]|LI)$/)) {
        endElement = endElement.parentElement;
      }
      
      if (startElement && endElement) {
        if (startElement === endElement) {
          // Selection within single block
          elements.push(startElement);
        } else {
          // Multi-block selection
          let current = startElement;
          elements.push(current);
          
          while (current && current !== endElement && current.nextElementSibling) {
            current = current.nextElementSibling;
            if (current.tagName?.match(/^(P|DIV|H[1-6]|LI)$/)) {
              elements.push(current);
            }
          }
          
          if (endElement && !elements.includes(endElement)) {
            elements.push(endElement);
          }
        }
      }
    }

    return elements;
  }, [getSelectionRange]);

  // Create a list from selected content
  const toggleList = useCallback((listType: 'ul' | 'ol') => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const savedPosition = saveCursorPosition();

    // Check if we're currently in a list
    const currentElement = range.startContainer.nodeType === Node.ELEMENT_NODE 
      ? range.startContainer as Element
      : range.startContainer.parentElement;
    
    const existingList = currentElement?.closest('ul, ol');
    const existingListItem = currentElement?.closest('li');

    if (existingList || existingListItem) {
      // Remove list formatting - convert back to paragraphs
      if (existingListItem && existingList) {
        const paragraph = document.createElement('p');
        paragraph.innerHTML = existingListItem.innerHTML;
        
        if (existingList.children.length === 1) {
          // Replace entire list with paragraph
          existingList.parentNode?.replaceChild(paragraph, existingList);
        } else {
          // Insert paragraph after list and remove list item
          existingList.parentNode?.insertBefore(paragraph, existingList.nextSibling);
          existingListItem.remove();
        }
      }
    } else {
      // Create new list
      if (range.collapsed) {
        // No selection - create single list item from current line
        let blockElement = currentElement;
        while (blockElement && !blockElement.tagName?.match(/^(P|DIV|H[1-6])$/)) {
          blockElement = blockElement.parentElement;
        }
        
        if (blockElement) {
          const listElement = document.createElement(listType);
          const listItem = document.createElement('li');
          listItem.innerHTML = blockElement.innerHTML || blockElement.textContent || 'New item';
          listElement.appendChild(listItem);
          
          blockElement.parentNode?.replaceChild(listElement, blockElement);
        } else {
          // Create new list at cursor position
          const listElement = document.createElement(listType);
          const listItem = document.createElement('li');
          listItem.textContent = 'New item';
          listElement.appendChild(listItem);
          
          range.insertNode(listElement);
        }
      } else {
        // Has selection - convert selected content to list
        const selectedContent = range.extractContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(selectedContent);
        
        // Get text content and split by lines/paragraphs
        const text = tempDiv.textContent || '';
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          lines.push('New item');
        }
        
        const listElement = document.createElement(listType);
        
        lines.forEach(line => {
          const listItem = document.createElement('li');
          listItem.textContent = line.trim();
          listElement.appendChild(listItem);
        });
        
        range.insertNode(listElement);
      }
    }

    // Restore cursor position
    setTimeout(() => {
      handleInput();
      if (savedPosition) {
        restoreCursorPosition(savedPosition);
      }
    }, 10);
  }, [saveCursorPosition, restoreCursorPosition, handleInput]);

  // Apply heading or normal format with complete text normalization
  const applyHeading = useCallback((level: 1 | 2 | 3 | 4 | 'p') => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const savedPosition = saveCursorPosition();

    if (range.collapsed) {
      // Just cursor position - apply to current block
      let element = range.startContainer.nodeType === Node.ELEMENT_NODE 
        ? range.startContainer as Element
        : range.startContainer.parentElement;
      
      while (element && element !== editorRef.current) {
        if (element.tagName?.match(/^(P|DIV|H[1-6]|LI)$/)) {
          if (element.tagName === 'LI') {
            return; // Skip list items for now
          }
          
          const newElement = document.createElement(level === 'p' ? 'p' : `h${level}`);
          
          if (level === 'p') {
            // Complete reset for normal text
            newElement.textContent = element.textContent || '';
            newElement.style.fontSize = '12px';
            newElement.style.fontFamily = 'inherit';
            newElement.style.fontWeight = 'normal';
            newElement.style.fontStyle = 'normal';
            newElement.style.textDecoration = 'none';
            newElement.style.color = 'inherit';
          } else {
            newElement.innerHTML = element.innerHTML;
          }
          
          element.parentNode?.replaceChild(newElement, element);
          break;
        }
        element = element.parentElement;
      }
    } else {
      // Selection range - apply to all selected content
      const selectedContent = range.extractContents();
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(selectedContent);

      if (level === 'p') {
        // Complete text normalization for normal text
        normalizeTextContent(tempDiv);
      } else {
        // Apply heading format
        const headingElement = document.createElement(`h${level}`);
        headingElement.textContent = tempDiv.textContent || '';
        tempDiv.innerHTML = '';
        tempDiv.appendChild(headingElement);
      }

      range.insertNode(tempDiv);
      
      // Unwrap the temp div
      const parent = tempDiv.parentNode;
      while (tempDiv.firstChild) {
        parent?.insertBefore(tempDiv.firstChild, tempDiv);
      }
      parent?.removeChild(tempDiv);
    }

    setTimeout(() => {
      handleInput();
      if (savedPosition) {
        restoreCursorPosition(savedPosition);
      }
    }, 10);
  }, [saveCursorPosition, restoreCursorPosition, handleInput]);

  // Complete text normalization function
  const normalizeTextContent = (element: Element) => {
    // Get all text content and strip all formatting
    const text = element.textContent || '';
    
    // Create clean paragraph with normalized styling
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    paragraph.style.fontSize = '12px';
    paragraph.style.fontFamily = 'inherit';
    paragraph.style.fontWeight = 'normal';
    paragraph.style.fontStyle = 'normal';
    paragraph.style.textDecoration = 'none';
    paragraph.style.color = 'inherit';
    paragraph.style.backgroundColor = 'transparent';
    paragraph.style.lineHeight = 'normal';
    
    // Replace element content
    element.innerHTML = '';
    element.appendChild(paragraph);
  };

  // Check if a format is currently active
  const isFormatActive = useCallback((command: string): boolean => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    if (command === 'insertUnorderedList') {
      const element = selection.anchorNode?.nodeType === Node.ELEMENT_NODE 
        ? selection.anchorNode as Element
        : selection.anchorNode?.parentElement;
      return element ? element.closest('ul') !== null : false;
    }
    
    if (command === 'insertOrderedList') {
      const element = selection.anchorNode?.nodeType === Node.ELEMENT_NODE 
        ? selection.anchorNode as Element
        : selection.anchorNode?.parentElement;
      return element ? element.closest('ol') !== null : false;
    }

    // For bold, italic, underline - check actual DOM structure
    if (command === 'bold') {
      return checkCurrentFormat(['STRONG', 'B']);
    }
    
    if (command === 'italic') {
      return checkCurrentFormat(['EM', 'I']);
    }
    
    if (command === 'underline') {
      return checkCurrentFormat(['U']);
    }

    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  }, []);

  // Check if current selection has specific format tags
  const checkCurrentFormat = useCallback((tags: string[]): boolean => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    
    if (range.collapsed) {
      // Check cursor position
      let element = range.startContainer.nodeType === Node.ELEMENT_NODE 
        ? range.startContainer as Element
        : range.startContainer.parentElement;
      
      while (element && element !== editorRef.current) {
        if (tags.includes(element.tagName)) {
          return true;
        }
        element = element.parentElement;
      }
      return false;
    } else {
      // Check if selection has the format
      const contents = range.cloneContents();
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(contents);
      
      return checkFormatInContent(tempDiv, tags[0].toLowerCase());
    }
  }, []);

  // Get current block format
  const getCurrentBlockFormat = useCallback((): string => {
    const selection = window.getSelection();
    if (selection && selection.anchorNode) {
      let element = selection.anchorNode.nodeType === Node.ELEMENT_NODE 
        ? selection.anchorNode as Element
        : selection.anchorNode.parentElement;
      
      while (element && element !== editorRef.current) {
        if (element.tagName.match(/^(P|DIV|H[1-6])$/)) {
          return element.tagName.toLowerCase();
        }
        element = element.parentElement;
      }
    }
    
    return 'p';
  }, []);

  // Toolbar button component
  const ToolbarButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    tooltip: string;
    children: React.ReactNode;
  }> = ({ onClick, isActive = false, tooltip, children }) => (
    <CustomTooltip content={tooltip}>
      <Button
        type="button"
        variant={isActive ? "default" : "ghost"}
        size="sm"
        onClick={onClick}
        className={`h-8 w-8 p-0 ${isActive ? 'bg-sky-600 text-white' : 'hover:bg-slate-700'}`}
      >
        {children}
      </Button>
    </CustomTooltip>
  );

  // Handle editor focus
  const handleFocus = () => {
    setIsEditorFocused(true);
  };

  const handleBlur = () => {
    setIsEditorFocused(false);
    // Use a timeout to ensure final content is captured without interfering with cursor
    setTimeout(() => handleInput(), 10);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          formatText('bold');
          break;
        case 'i':
          e.preventDefault();
          formatText('italic');
          break;
        case 'u':
          e.preventDefault();
          formatText('underline');
          break;
      }
    }
  };

  return (
    <div className={`rich-text-editor border border-slate-700 rounded-md overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-slate-800 border-b border-slate-700 flex-wrap">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 mr-2">
          <ToolbarButton
            onClick={() => formatText('bold')}
            isActive={isFormatActive('bold')}
            tooltip="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => formatText('italic')}
            isActive={isFormatActive('italic')}
            tooltip="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => formatText('underline')}
            isActive={isFormatActive('underline')}
            tooltip="Underline (Ctrl+U)"
          >
            <Underline className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-slate-600 mr-2" />

        {/* Headings */}
        <div className="flex items-center gap-1 mr-2">
          <ToolbarButton
            onClick={() => applyHeading('p')}
            isActive={getCurrentBlockFormat() === 'p'}
            tooltip="Normal Text"
          >
            <Type className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => applyHeading(1)}
            isActive={getCurrentBlockFormat() === 'h1'}
            tooltip="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => applyHeading(2)}
            isActive={getCurrentBlockFormat() === 'h2'}
            tooltip="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => applyHeading(3)}
            isActive={getCurrentBlockFormat() === 'h3'}
            tooltip="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => applyHeading(4)}
            isActive={getCurrentBlockFormat() === 'h4'}
            tooltip="Heading 4"
          >
            <Heading4 className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-slate-600 mr-2" />

        {/* Lists */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => toggleList('ul')}
            isActive={isFormatActive('insertUnorderedList')}
            tooltip="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => toggleList('ol')}
            isActive={isFormatActive('insertOrderedList')}
            tooltip="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className={`
          min-h-[120px] max-h-[300px] overflow-y-auto p-3 text-slate-100 bg-slate-900
          focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-inset
          ${!editorRef.current?.textContent?.trim() && !editorRef.current?.innerHTML?.trim() ? 'empty' : ''}
        `}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onKeyUp={debouncedHandleInput}
        onMouseUp={debouncedHandleInput}
        onPaste={handleInput}
        style={{
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap'
        }}
        data-placeholder={placeholder}
      />

      {/* Embedded styles for rich text formatting */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .rich-text-editor [contenteditable][data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: #64748b;
            pointer-events: none;
            opacity: 0.6;
          }
          
          .rich-text-editor [contenteditable] * {
            color: inherit !important;
          }
          
          .rich-text-editor [contenteditable] h1 {
            font-size: 1.5rem;
            font-weight: bold;
            margin: 0.5rem 0;
            line-height: 1.2;
            color: #f1f5f9 !important;
          }
          
          .rich-text-editor [contenteditable] h2 {
            font-size: 1.25rem;
            font-weight: bold;
            margin: 0.4rem 0;
            line-height: 1.3;
            color: #f1f5f9 !important;
          }
          
          .rich-text-editor [contenteditable] h3 {
            font-size: 1.125rem;
            font-weight: bold;
            margin: 0.3rem 0;
            line-height: 1.4;
            color: #f1f5f9 !important;
          }
          
          .rich-text-editor [contenteditable] h4 {
            font-size: 1rem;
            font-weight: bold;
            margin: 0.25rem 0;
            line-height: 1.4;
            color: #f1f5f9 !important;
          }
          
          .rich-text-editor [contenteditable] ul, .rich-text-editor [contenteditable] ol {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
            color: #f1f5f9 !important;
          }
          
          .rich-text-editor [contenteditable] li {
            margin: 0.25rem 0;
            color: #f1f5f9 !important;
          }
          
          .rich-text-editor [contenteditable] p {
            margin: 0.5rem 0;
            color: #f1f5f9 !important;
          }
          
          .rich-text-editor [contenteditable] div {
            color: #f1f5f9 !important;
          }
          
          .rich-text-editor [contenteditable] span {
            color: inherit !important;
          }
          
          .rich-text-editor [contenteditable] strong, .rich-text-editor [contenteditable] b {
            font-weight: bold;
            color: inherit !important;
          }
          
          .rich-text-editor [contenteditable] em, .rich-text-editor [contenteditable] i {
            font-style: italic;
            color: inherit !important;
          }
          
          .rich-text-editor [contenteditable] u {
            text-decoration: underline;
            color: inherit !important;
          }
          
          .rich-text-editor [contenteditable] a {
            color: #60a5fa !important;
            text-decoration: underline;
          }
          
          .rich-text-editor [contenteditable] a:hover {
            color: #93c5fd !important;
          }
        `
      }} />
    </div>
  );
};