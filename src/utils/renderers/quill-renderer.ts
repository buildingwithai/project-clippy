/**
 * Quill Delta renderer for converting ClippyContent to Quill Delta format
 * 
 * This renderer converts semantic ClippyContent blocks to Quill Delta operations
 * for seamless integration with Quill.js editors (used by LinkedIn and others)
 */

import type { 
  ClippyContent, 
  ContentBlock, 
  InlineContent, 
  TextSpan, 
  LinkSpan, 
  ParagraphBlock,
  HeadingBlock,
  ListBlock,
  QuoteBlock,
  CodeBlock,
  DividerBlock,
  ListItem
} from '../types';

/**
 * Quill Delta operation interface
 */
export interface QuillOp {
  insert?: string | object;
  attributes?: Record<string, any>;
  retain?: number;
  delete?: number;
}

/**
 * Quill Delta format
 */
export interface QuillDelta {
  ops: QuillOp[];
}

/**
 * Quill rendering configuration
 */
export interface QuillRenderConfig {
  supportNestedLists: boolean;
  maxListDepth: number;
  preserveFormatting: boolean;
  useCodeBlocks: boolean;
}

/**
 * Default Quill rendering configuration
 */
export const DEFAULT_QUILL_CONFIG: QuillRenderConfig = {
  supportNestedLists: true,
  maxListDepth: 3,
  preserveFormatting: true,
  useCodeBlocks: true
};

/**
 * Main function to render ClippyContent as Quill Delta
 */
export function renderClippyContentToQuillDelta(
  content: ClippyContent,
  config: Partial<QuillRenderConfig> = {}
): QuillDelta {
  const fullConfig = { ...DEFAULT_QUILL_CONFIG, ...config };
  
  if (!content || !content.blocks || content.blocks.length === 0) {
    return { ops: [] };
  }

  const ops: QuillOp[] = [];
  
  for (let i = 0; i < content.blocks.length; i++) {
    const block = content.blocks[i];
    const blockOps = renderContentBlock(block, fullConfig, 0);
    ops.push(...blockOps);
    
    // Add newline between blocks (except for the last block)
    if (i < content.blocks.length - 1) {
      ops.push({ insert: '\n' });
    }
  }

  return { ops: optimizeDelta(ops) };
}

/**
 * Renders a single content block to Quill operations
 */
function renderContentBlock(
  block: ContentBlock, 
  config: QuillRenderConfig, 
  depth: number = 0
): QuillOp[] {
  switch (block.type) {
    case 'paragraph':
      return renderParagraphBlock(block, config);
    case 'heading':
      return renderHeadingBlock(block, config);
    case 'list':
      return renderListBlock(block, config, depth);
    case 'quote':
      return renderQuoteBlock(block, config);
    case 'code':
      return renderCodeBlock(block, config);
    case 'divider':
      return renderDividerBlock(block, config);
    default:
      console.warn(`[Quill Renderer] Unknown block type: ${(block as any).type}`);
      return [];
  }
}

/**
 * Renders a paragraph block
 */
function renderParagraphBlock(block: ParagraphBlock, config: QuillRenderConfig): QuillOp[] {
  const ops = renderInlineContent(block.content, config);
  ops.push({ insert: '\n' });
  return ops;
}

/**
 * Renders a heading block
 */
function renderHeadingBlock(block: HeadingBlock, config: QuillRenderConfig): QuillOp[] {
  const ops = renderInlineContent(block.content, config);
  ops.push({ 
    insert: '\n', 
    attributes: { 
      header: block.level 
    } 
  });
  return ops;
}

/**
 * Renders a list block
 */
function renderListBlock(
  block: ListBlock, 
  config: QuillRenderConfig, 
  depth: number = 0
): QuillOp[] {
  if (depth >= config.maxListDepth) {
    console.warn(`[Quill Renderer] Maximum list depth (${config.maxListDepth}) exceeded`);
    // Convert to paragraph instead
    const flattenedOps: QuillOp[] = [];
    block.items.forEach(item => {
      const prefix = '• '; // Simple bullet for flattened lists
      flattenedOps.push({ insert: prefix });
      flattenedOps.push(...renderInlineContent(item.content, config));
      flattenedOps.push({ insert: '\n' });
    });
    return flattenedOps;
  }

  const ops: QuillOp[] = [];
  const listType = block.listType === 'numbered' ? 'ordered' : 'bullet';

  for (const item of block.items) {
    // Render item content
    const itemOps = renderInlineContent(item.content, config);
    ops.push(...itemOps);
    
    // Add list formatting to the newline
    const listAttributes: Record<string, any> = { list: listType };
    
    // Add indent for nested lists
    if (depth > 0 && config.supportNestedLists) {
      listAttributes.indent = depth;
    }
    
    ops.push({ 
      insert: '\n', 
      attributes: listAttributes
    });

    // Handle nested lists
    if (item.nested && config.supportNestedLists) {
      const nestedOps = renderListBlock(item.nested, config, depth + 1);
      ops.push(...nestedOps);
    }
  }

  return ops;
}

/**
 * Renders a quote block
 */
function renderQuoteBlock(block: QuoteBlock, config: QuillRenderConfig): QuillOp[] {
  const ops = renderInlineContent(block.content, config);
  ops.push({ 
    insert: '\n', 
    attributes: { 
      blockquote: true 
    } 
  });
  return ops;
}

/**
 * Renders a code block
 */
function renderCodeBlock(block: CodeBlock, config: QuillRenderConfig): QuillOp[] {
  if (config.useCodeBlocks) {
    // Use Quill's code block format
    const ops: QuillOp[] = [
      { insert: block.content },
      { 
        insert: '\n', 
        attributes: { 
          'code-block': true 
        } 
      }
    ];
    return ops;
  } else {
    // Fall back to inline code formatting
    const ops: QuillOp[] = [
      { 
        insert: block.content,
        attributes: { code: true }
      },
      { insert: '\n' }
    ];
    return ops;
  }
}

/**
 * Renders a divider block
 */
function renderDividerBlock(block: DividerBlock, config: QuillRenderConfig): QuillOp[] {
  // Quill doesn't have native divider support, so use a line of dashes
  return [
    { insert: '---' },
    { insert: '\n' }
  ];
}

/**
 * Renders inline content to Quill operations
 */
function renderInlineContent(content: InlineContent[], config: QuillRenderConfig): QuillOp[] {
  const ops: QuillOp[] = [];
  
  for (const inline of content) {
    ops.push(...renderInlineElement(inline, config));
  }
  
  return ops;
}

/**
 * Renders a single inline element to Quill operations
 */
function renderInlineElement(inline: InlineContent, config: QuillRenderConfig): QuillOp[] {
  switch (inline.type) {
    case 'text':
      return renderTextSpan(inline, config);
    case 'link':
      return renderLinkSpan(inline, config);
    case 'linebreak':
      return [{ insert: '\n' }];
    default:
      console.warn(`[Quill Renderer] Unknown inline type: ${(inline as any).type}`);
      return [];
  }
}

/**
 * Renders a text span with formatting
 */
function renderTextSpan(span: TextSpan, config: QuillRenderConfig): QuillOp[] {
  if (!span.text) {
    return [];
  }

  const attributes: Record<string, any> = {};
  
  if (config.preserveFormatting && span.formatting) {
    if (span.formatting.bold) {
      attributes.bold = true;
    }
    if (span.formatting.italic) {
      attributes.italic = true;
    }
    if (span.formatting.underline) {
      attributes.underline = true;
    }
    if (span.formatting.strikethrough) {
      attributes.strike = true;
    }
    if (span.formatting.code) {
      attributes.code = true;
    }
  }

  const op: QuillOp = { insert: span.text };
  if (Object.keys(attributes).length > 0) {
    op.attributes = attributes;
  }

  return [op];
}

/**
 * Renders a link span
 */
function renderLinkSpan(span: LinkSpan, config: QuillRenderConfig): QuillOp[] {
  if (!span.text) {
    return [];
  }

  const attributes: Record<string, any> = {
    link: span.url
  };
  
  if (config.preserveFormatting && span.formatting) {
    if (span.formatting.bold) {
      attributes.bold = true;
    }
    if (span.formatting.italic) {
      attributes.italic = true;
    }
    if (span.formatting.underline) {
      attributes.underline = true;
    }
    if (span.formatting.strikethrough) {
      attributes.strike = true;
    }
    if (span.formatting.code) {
      attributes.code = true;
    }
  }

  return [{
    insert: span.text,
    attributes
  }];
}

/**
 * Optimizes Delta operations by merging adjacent operations with the same attributes
 */
function optimizeDelta(ops: QuillOp[]): QuillOp[] {
  if (ops.length === 0) {
    return ops;
  }

  const optimized: QuillOp[] = [];
  
  for (const op of ops) {
    const lastOp = optimized[optimized.length - 1];
    
    // Try to merge with the previous operation
    if (lastOp && 
        lastOp.insert && 
        op.insert && 
        typeof lastOp.insert === 'string' && 
        typeof op.insert === 'string' &&
        attributesEqual(lastOp.attributes, op.attributes)) {
      
      // Merge text inserts
      lastOp.insert += op.insert;
    } else {
      optimized.push({ ...op });
    }
  }
  
  return optimized;
}

/**
 * Compares two attribute objects for equality
 */
function attributesEqual(
  a: Record<string, any> | undefined, 
  b: Record<string, any> | undefined
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => a[key] === b[key]);
}

/**
 * Utility function to create a simple text operation
 */
export function createTextOp(text: string, attributes?: Record<string, any>): QuillOp {
  const op: QuillOp = { insert: text };
  if (attributes && Object.keys(attributes).length > 0) {
    op.attributes = attributes;
  }
  return op;
}

/**
 * Utility function to create a newline operation with formatting
 */
export function createNewlineOp(attributes?: Record<string, any>): QuillOp {
  const op: QuillOp = { insert: '\n' };
  if (attributes && Object.keys(attributes).length > 0) {
    op.attributes = attributes;
  }
  return op;
}

/**
 * Utility function to apply Delta to a Quill editor
 */
export function applyDeltaToQuill(delta: QuillDelta, quillInstance: any): void {
  try {
    // Clear existing content
    quillInstance.setContents([]);
    
    // Apply new content
    quillInstance.setContents(delta);
    
    // Set cursor to end
    quillInstance.setSelection(quillInstance.getLength());
  } catch (error) {
    console.error('[Quill Renderer] Error applying delta to Quill:', error);
    
    // Fallback: try setting as plain text
    const plainText = getPlainTextFromDelta(delta);
    quillInstance.setText(plainText);
  }
}

/**
 * Extracts plain text from a Quill Delta
 */
export function getPlainTextFromDelta(delta: QuillDelta): string {
  return delta.ops
    .map(op => typeof op.insert === 'string' ? op.insert : '')
    .join('');
}

/**
 * Converts plain text to a simple Quill Delta
 */
export function textToQuillDelta(text: string): QuillDelta {
  if (!text) {
    return { ops: [] };
  }

  // Split into paragraphs and create operations
  const paragraphs = text.split('\n');
  const ops: QuillOp[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i]) {
      ops.push({ insert: paragraphs[i] });
    }
    
    // Add newline (except for the last paragraph if it's empty)
    if (i < paragraphs.length - 1 || paragraphs[i]) {
      ops.push({ insert: '\n' });
    }
  }

  return { ops };
}