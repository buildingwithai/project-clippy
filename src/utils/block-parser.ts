/**
 * Block-level element parser for converting HTML to ClippyContent blocks
 * 
 * This module handles the second stage of HTML processing:
 * 1. Parse block-level HTML elements into ClippyContent blocks
 * 2. Handle semantic meaning and structure
 * 3. Manage complex nesting scenarios
 * 4. Preserve content hierarchy
 */

import type { 
  ClippyContent, 
  ContentBlock, 
  ParagraphBlock, 
  HeadingBlock, 
  ListBlock, 
  QuoteBlock, 
  CodeBlock, 
  DividerBlock,
  ListItem,
  InlineContent 
} from './types';
import { cleanHTML } from './html-sanitizer';
import { parseInlineContent } from './inline-parser';

/**
 * Configuration for block parsing
 */
export interface BlockParseConfig {
  preserveSourceInfo: boolean;
  maxNestingLevel: number;
  generateIds: boolean;
  handleEmptyBlocks: boolean;
}

/**
 * Default block parsing configuration
 */
export const DEFAULT_BLOCK_CONFIG: BlockParseConfig = {
  preserveSourceInfo: true,
  maxNestingLevel: 10,
  generateIds: true,
  handleEmptyBlocks: true
};

/**
 * Parsing context for tracking state during parsing
 */
interface ParseContext {
  config: BlockParseConfig;
  idCounter: number;
  nestingLevel: number;
  sourceUrl?: string;
  sourceDomain?: string;
}

/**
 * Main function to parse HTML into ClippyContent
 */
export function parseHTMLToClippyContent(
  html: string, 
  options: {
    sourceUrl?: string;
    sourceDomain?: string;
    config?: Partial<BlockParseConfig>;
  } = {}
): ClippyContent {
  const config = { ...DEFAULT_BLOCK_CONFIG, ...options.config };
  const context: ParseContext = {
    config,
    idCounter: 0,
    nestingLevel: 0,
    sourceUrl: options.sourceUrl,
    sourceDomain: options.sourceDomain
  };

  // Step 1: Clean and sanitize HTML
  const cleanedHTML = cleanHTML(html);
  
  if (!cleanedHTML.trim()) {
    return createEmptyClippyContent(context);
  }

  // Step 2: Parse HTML into DOM
  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanedHTML, 'text/html');
  
  if (!doc.body) {
    return createEmptyClippyContent(context);
  }

  // Step 3: Extract blocks from DOM
  const blocks = parseElementsToBlocks(Array.from(doc.body.children), context);

  // Step 4: Handle edge cases
  const processedBlocks = postProcessBlocks(blocks, context);

  return {
    version: "1.0",
    blocks: processedBlocks,
    metadata: context.config.preserveSourceInfo ? {
      sourceUrl: context.sourceUrl,
      sourceDomain: context.sourceDomain,
      capturedAt: new Date().toISOString(),
      originalFormat: 'html'
    } : undefined
  };
}

/**
 * Creates an empty ClippyContent object
 */
function createEmptyClippyContent(context: ParseContext): ClippyContent {
  return {
    version: "1.0",
    blocks: [],
    metadata: context.config.preserveSourceInfo ? {
      sourceUrl: context.sourceUrl,
      sourceDomain: context.sourceDomain,
      capturedAt: new Date().toISOString(),
      originalFormat: 'html'
    } : undefined
  };
}

/**
 * Parses DOM elements into content blocks
 */
function parseElementsToBlocks(elements: Element[], context: ParseContext): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  for (const element of elements) {
    const block = parseElementToBlock(element, context);
    if (block) {
      blocks.push(block);
    }
  }

  return blocks;
}

/**
 * Parses a single DOM element into a content block
 */
function parseElementToBlock(element: Element, context: ParseContext): ContentBlock | null {
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case 'p':
      return parseParagraphBlock(element, context);
    
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return parseHeadingBlock(element, context);
    
    case 'ul':
    case 'ol':
      return parseListBlock(element, context);
    
    case 'blockquote':
      return parseQuoteBlock(element, context);
    
    case 'pre':
    case 'code':
      return parseCodeBlock(element, context);
    
    case 'hr':
      return parseDividerBlock(element, context);
    
    case 'div':
      return parseDivBlock(element, context);
    
    case 'br':
      // Skip standalone br elements - they're handled in inline parsing
      return null;
    
    default:
      // For unknown block elements, try to parse as paragraph
      return parseUnknownBlock(element, context);
  }
}

/**
 * Parses a paragraph element
 */
function parseParagraphBlock(element: Element, context: ParseContext): ParagraphBlock | null {
  const inlineContent = parseInlineContent(element.innerHTML);
  
  if (!context.config.handleEmptyBlocks && inlineContent.length === 0) {
    return null;
  }

  return {
    type: 'paragraph',
    id: generateBlockId(context),
    content: inlineContent
  };
}

/**
 * Parses a heading element
 */
function parseHeadingBlock(element: Element, context: ParseContext): HeadingBlock | null {
  const level = parseInt(element.tagName.substring(1)) as 1 | 2 | 3 | 4 | 5 | 6;
  const inlineContent = parseInlineContent(element.innerHTML);
  
  if (!context.config.handleEmptyBlocks && inlineContent.length === 0) {
    return null;
  }

  return {
    type: 'heading',
    id: generateBlockId(context),
    level,
    content: inlineContent
  };
}

/**
 * Parses a list element (ul or ol)
 */
function parseListBlock(element: Element, context: ParseContext): ListBlock | null {
  if (context.nestingLevel >= context.config.maxNestingLevel) {
    console.warn('[Block Parser] Maximum nesting level reached, skipping list');
    return null;
  }

  const listType = element.tagName.toLowerCase() === 'ol' ? 'numbered' : 'bulleted';
  const items: ListItem[] = [];

  // Find all direct li children
  const listItems = Array.from(element.children).filter(child => 
    child.tagName.toLowerCase() === 'li'
  );

  for (const li of listItems) {
    const item = parseListItem(li, { ...context, nestingLevel: context.nestingLevel + 1 });
    if (item) {
      items.push(item);
    }
  }

  if (items.length === 0) {
    return null;
  }

  return {
    type: 'list',
    id: generateBlockId(context),
    listType,
    items
  };
}

/**
 * Parses a list item element
 */
function parseListItem(element: Element, context: ParseContext): ListItem | null {
  const item: ListItem = {
    id: generateBlockId(context),
    content: [],
    nested: undefined
  };

  // Separate direct text/inline content from nested lists
  const contentElements: Node[] = [];
  let nestedList: Element | null = null;

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const childElement = child as Element;
      const tagName = childElement.tagName.toLowerCase();
      
      if (tagName === 'ul' || tagName === 'ol') {
        // Found nested list - only take the first one
        if (!nestedList) {
          nestedList = childElement;
        }
      } else {
        contentElements.push(child);
      }
    } else {
      contentElements.push(child);
    }
  }

  // Parse inline content from non-list elements
  const tempDiv = document.createElement('div');
  contentElements.forEach(node => {
    tempDiv.appendChild(node.cloneNode(true));
  });
  
  item.content = parseInlineContent(tempDiv.innerHTML);

  // Parse nested list if found
  if (nestedList) {
    const nestedBlock = parseListBlock(nestedList, context);
    if (nestedBlock) {
      item.nested = nestedBlock;
    }
  }

  // Don't include empty list items unless configured to handle them
  if (!context.config.handleEmptyBlocks && 
      item.content.length === 0 && !item.nested) {
    return null;
  }

  return item;
}

/**
 * Parses a blockquote element
 */
function parseQuoteBlock(element: Element, context: ParseContext): QuoteBlock | null {
  const inlineContent = parseInlineContent(element.innerHTML);
  
  if (!context.config.handleEmptyBlocks && inlineContent.length === 0) {
    return null;
  }

  // Extract citation if present
  const citation = element.getAttribute('cite') || undefined;

  return {
    type: 'quote',
    id: generateBlockId(context),
    content: inlineContent,
    citation
  };
}

/**
 * Parses a code block element (pre or code)
 */
function parseCodeBlock(element: Element, context: ParseContext): CodeBlock | null {
  let codeContent = '';
  let language: string | undefined;

  if (element.tagName.toLowerCase() === 'pre') {
    // Look for code element inside pre
    const codeElement = element.querySelector('code');
    if (codeElement) {
      codeContent = codeElement.textContent || '';
      language = extractLanguageFromClass(codeElement.className);
    } else {
      codeContent = element.textContent || '';
    }
  } else {
    // Direct code element
    codeContent = element.textContent || '';
    language = extractLanguageFromClass(element.className);
  }

  if (!context.config.handleEmptyBlocks && !codeContent.trim()) {
    return null;
  }

  return {
    type: 'code',
    id: generateBlockId(context),
    content: codeContent,
    language
  };
}

/**
 * Parses a divider element (hr)
 */
function parseDividerBlock(element: Element, context: ParseContext): DividerBlock {
  return {
    type: 'divider',
    id: generateBlockId(context)
  };
}

/**
 * Parses a div element - tries to determine if it should be a paragraph or split into multiple blocks
 */
function parseDivBlock(element: Element, context: ParseContext): ContentBlock | null {
  // Check if div contains only inline content
  const hasBlockChildren = Array.from(element.children).some(child => {
    const tagName = child.tagName.toLowerCase();
    return ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'pre', 'hr'].includes(tagName);
  });

  if (!hasBlockChildren) {
    // Treat as paragraph
    return parseParagraphBlock(element, context);
  }

  // Div contains block elements - we should parse children separately
  // This is handled at a higher level, so return null here
  return null;
}

/**
 * Parses unknown block elements by treating them as paragraphs
 */
function parseUnknownBlock(element: Element, context: ParseContext): ContentBlock | null {
  console.warn(`[Block Parser] Unknown block element: ${element.tagName}`);
  
  // Try to parse as paragraph
  const inlineContent = parseInlineContent(element.innerHTML);
  
  if (!context.config.handleEmptyBlocks && inlineContent.length === 0) {
    return null;
  }

  return {
    type: 'paragraph',
    id: generateBlockId(context),
    content: inlineContent
  };
}

/**
 * Extracts programming language from class attribute
 */
function extractLanguageFromClass(className: string): string | undefined {
  if (!className) return undefined;

  // Common patterns for language classes
  const patterns = [
    /language-(\w+)/,
    /lang-(\w+)/,
    /highlight-(\w+)/,
    /(\w+)-code/
  ];

  for (const pattern of patterns) {
    const match = className.match(pattern);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  }

  // If no pattern matches, check if the class itself is a known language
  const knownLanguages = [
    'javascript', 'js', 'typescript', 'ts', 'python', 'py', 'java', 'c', 'cpp', 
    'csharp', 'cs', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'scala',
    'html', 'css', 'scss', 'sass', 'less', 'xml', 'json', 'yaml', 'yml',
    'markdown', 'md', 'bash', 'sh', 'sql', 'r', 'matlab', 'julia'
  ];

  const classes = className.toLowerCase().split(/\s+/);
  for (const cls of classes) {
    if (knownLanguages.includes(cls)) {
      return cls;
    }
  }

  return undefined;
}

/**
 * Generates a unique block ID
 */
function generateBlockId(context: ParseContext): string {
  if (!context.config.generateIds) {
    return '';
  }
  
  return `block-${Date.now()}-${context.idCounter++}`;
}

/**
 * Post-processes blocks to handle edge cases
 */
function postProcessBlocks(blocks: ContentBlock[], context: ParseContext): ContentBlock[] {
  let processedBlocks = [...blocks];

  // Remove empty blocks if not configured to handle them
  if (!context.config.handleEmptyBlocks) {
    processedBlocks = processedBlocks.filter(block => !isEmptyBlock(block));
  }

  // Merge consecutive paragraphs with only line breaks (optional enhancement)
  processedBlocks = mergeConsecutiveParagraphs(processedBlocks);

  return processedBlocks;
}

/**
 * Checks if a block is considered empty
 */
function isEmptyBlock(block: ContentBlock): boolean {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'quote':
      return block.content.length === 0 || 
             (block.content.length === 1 && 
              block.content[0].type === 'text' && 
              !block.content[0].text.trim());
    
    case 'list':
      return block.items.length === 0;
    
    case 'code':
      return !block.content.trim();
    
    case 'divider':
      return false; // Dividers are never empty
    
    default:
      return false;
  }
}

/**
 * Merges consecutive paragraphs that only contain line breaks
 */
function mergeConsecutiveParagraphs(blocks: ContentBlock[]): ContentBlock[] {
  // This is a placeholder for potential enhancement
  // For now, just return the blocks as-is
  return blocks;
}

/**
 * Utility function to parse plain text into ClippyContent
 */
export function parseTextToClippyContent(
  text: string,
  options: {
    sourceUrl?: string;
    sourceDomain?: string;
  } = {}
): ClippyContent {
  if (!text || typeof text !== 'string') {
    return {
      version: "1.0",
      blocks: [],
      metadata: {
        sourceUrl: options.sourceUrl,
        sourceDomain: options.sourceDomain,
        capturedAt: new Date().toISOString(),
        originalFormat: 'text'
      }
    };
  }

  // Split text into paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  
  const blocks: ContentBlock[] = paragraphs.map((paragraph, index) => ({
    type: 'paragraph',
    id: `block-${Date.now()}-${index}`,
    content: [{
      type: 'text',
      text: paragraph.trim()
    }]
  }));

  return {
    version: "1.0",
    blocks,
    metadata: {
      sourceUrl: options.sourceUrl,
      sourceDomain: options.sourceDomain,
      capturedAt: new Date().toISOString(),
      originalFormat: 'text'
    }
  };
}