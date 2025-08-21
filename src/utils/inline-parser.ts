/**
 * Inline content parser for converting HTML inline elements to ClippyContent
 * 
 * This module handles parsing of inline formatting and content:
 * 1. Text spans with formatting (bold, italic, etc.)
 * 2. Links with proper URL handling
 * 3. Line breaks and whitespace management
 * 4. Nested formatting preservation
 */

import type { InlineContent, TextSpan, LinkSpan, LineBreak, TextFormatting } from './types';

/**
 * Configuration for inline parsing
 */
export interface InlineParseConfig {
  preserveWhitespace: boolean;
  mergeAdjacentText: boolean;
  maxLinkLength: number;
  validateUrls: boolean;
}

/**
 * Default inline parsing configuration
 */
export const DEFAULT_INLINE_CONFIG: InlineParseConfig = {
  preserveWhitespace: false,
  mergeAdjacentText: true,
  maxLinkLength: 2000,
  validateUrls: true
};

/**
 * Parsing context for inline content
 */
interface InlineParseContext {
  config: InlineParseConfig;
  currentFormatting: TextFormatting;
  textBuffer: string;
  result: InlineContent[];
}

/**
 * Main function to parse HTML inline content into ClippyContent inline elements
 */
export function parseInlineContent(
  html: string, 
  config: Partial<InlineParseConfig> = {}
): InlineContent[] {
  const fullConfig = { ...DEFAULT_INLINE_CONFIG, ...config };
  
  if (!html || typeof html !== 'string') {
    return [];
  }

  // Create parsing context
  const context: InlineParseContext = {
    config: fullConfig,
    currentFormatting: {},
    textBuffer: '',
    result: []
  };

  // Parse HTML into DOM for processing
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstChild as Element;

  if (!container) {
    return [];
  }

  // Process all child nodes
  processInlineNodes(container.childNodes, context);

  // Flush any remaining text in buffer
  flushTextBuffer(context);

  // Post-process the result
  return postProcessInlineContent(context.result, fullConfig);
}

/**
 * Processes a list of DOM nodes into inline content
 */
function processInlineNodes(nodes: NodeList, context: InlineParseContext): void {
  for (const node of Array.from(nodes)) {
    processInlineNode(node, context);
  }
}

/**
 * Processes a single DOM node into inline content
 */
function processInlineNode(node: Node, context: InlineParseContext): void {
  if (node.nodeType === Node.TEXT_NODE) {
    processTextNode(node as Text, context);
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    processElementNode(node as Element, context);
  }
}

/**
 * Processes a text node
 */
function processTextNode(textNode: Text, context: InlineParseContext): void {
  let text = textNode.textContent || '';
  
  if (!context.config.preserveWhitespace) {
    // Normalize whitespace
    text = normalizeWhitespace(text);
  }

  if (text) {
    context.textBuffer += text;
  }
}

/**
 * Processes an element node
 */
function processElementNode(element: Element, context: InlineParseContext): void {
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case 'strong':
    case 'b':
      processFormattingElement(element, context, { bold: true });
      break;
    
    case 'em':
    case 'i':
      processFormattingElement(element, context, { italic: true });
      break;
    
    case 'u':
      processFormattingElement(element, context, { underline: true });
      break;
    
    case 's':
    case 'del':
    case 'strike':
      processFormattingElement(element, context, { strikethrough: true });
      break;
    
    case 'code':
      processFormattingElement(element, context, { code: true });
      break;
    
    case 'a':
      processLinkElement(element, context);
      break;
    
    case 'br':
      processLineBreak(context);
      break;
    
    case 'span':
      processSpanElement(element, context);
      break;
    
    default:
      // For unknown inline elements, just process their children
      processInlineNodes(element.childNodes, context);
      break;
  }
}

/**
 * Processes an element that adds text formatting
 */
function processFormattingElement(
  element: Element, 
  context: InlineParseContext, 
  additionalFormatting: Partial<TextFormatting>
): void {
  // Save current formatting state
  const previousFormatting = { ...context.currentFormatting };
  
  // Apply additional formatting
  context.currentFormatting = { ...context.currentFormatting, ...additionalFormatting };
  
  // Process children with new formatting
  processInlineNodes(element.childNodes, context);
  
  // Restore previous formatting
  context.currentFormatting = previousFormatting;
}

/**
 * Processes a link element
 */
function processLinkElement(element: Element, context: InlineParseContext): void {
  const href = element.getAttribute('href');
  
  if (!href) {
    // No href - treat as regular text
    processInlineNodes(element.childNodes, context);
    return;
  }

  // Validate URL if configured
  if (context.config.validateUrls && !isValidUrl(href)) {
    console.warn(`[Inline Parser] Invalid URL: ${href}`);
    processInlineNodes(element.childNodes, context);
    return;
  }

  // Check URL length
  if (href.length > context.config.maxLinkLength) {
    console.warn(`[Inline Parser] URL too long: ${href.length} chars`);
    processInlineNodes(element.childNodes, context);
    return;
  }

  // Flush any pending text
  flushTextBuffer(context);

  // Extract link text
  const linkText = element.textContent || href;
  
  // Create link span with current formatting
  const linkSpan: LinkSpan = {
    type: 'link',
    url: href,
    text: linkText,
    formatting: hasAnyFormatting(context.currentFormatting) ? { ...context.currentFormatting } : undefined
  };

  context.result.push(linkSpan);
}

/**
 * Processes a line break element
 */
function processLineBreak(context: InlineParseContext): void {
  // Flush any pending text
  flushTextBuffer(context);
  
  // Add line break
  const lineBreak: LineBreak = {
    type: 'linebreak'
  };
  
  context.result.push(lineBreak);
}

/**
 * Processes a span element - check for style-based formatting
 */
function processSpanElement(element: Element, context: InlineParseContext): void {
  const additionalFormatting = extractFormattingFromStyle(element);
  
  if (hasAnyFormatting(additionalFormatting)) {
    processFormattingElement(element, context, additionalFormatting);
  } else {
    // No additional formatting - just process children
    processInlineNodes(element.childNodes, context);
  }
}

/**
 * Extracts formatting from CSS style attribute
 */
function extractFormattingFromStyle(element: Element): Partial<TextFormatting> {
  const style = element.getAttribute('style');
  const formatting: Partial<TextFormatting> = {};
  
  if (!style) {
    return formatting;
  }

  const lowerStyle = style.toLowerCase();

  // Check for bold
  if (lowerStyle.includes('font-weight:bold') || 
      lowerStyle.includes('font-weight: bold') ||
      lowerStyle.includes('font-weight:700') ||
      lowerStyle.includes('font-weight: 700')) {
    formatting.bold = true;
  }

  // Check for italic
  if (lowerStyle.includes('font-style:italic') || 
      lowerStyle.includes('font-style: italic')) {
    formatting.italic = true;
  }

  // Check for underline
  if (lowerStyle.includes('text-decoration:underline') || 
      lowerStyle.includes('text-decoration: underline') ||
      lowerStyle.includes('text-decoration-line:underline') ||
      lowerStyle.includes('text-decoration-line: underline')) {
    formatting.underline = true;
  }

  // Check for strikethrough
  if (lowerStyle.includes('text-decoration:line-through') || 
      lowerStyle.includes('text-decoration: line-through') ||
      lowerStyle.includes('text-decoration-line:line-through') ||
      lowerStyle.includes('text-decoration-line: line-through')) {
    formatting.strikethrough = true;
  }

  return formatting;
}

/**
 * Flushes accumulated text in the buffer to the result
 */
function flushTextBuffer(context: InlineParseContext): void {
  if (context.textBuffer) {
    const textSpan: TextSpan = {
      type: 'text',
      text: context.textBuffer,
      formatting: hasAnyFormatting(context.currentFormatting) ? { ...context.currentFormatting } : undefined
    };
    
    context.result.push(textSpan);
    context.textBuffer = '';
  }
}

/**
 * Checks if formatting object has any active formatting
 */
function hasAnyFormatting(formatting: TextFormatting): boolean {
  return Object.values(formatting).some(value => value === true);
}

/**
 * Normalizes whitespace in text
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Multiple whitespace -> single space
    .replace(/^\s+|\s+$/g, ''); // Trim start and end
}

/**
 * Validates if a string is a safe URL
 */
function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Allow relative URLs
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return true;
  }

  // Allow anchor links
  if (url.startsWith('#')) {
    return true;
  }

  // Allow mailto and tel links
  if (url.startsWith('mailto:') || url.startsWith('tel:')) {
    return true;
  }

  try {
    const urlObj = new URL(url);
    const safeProtocols = ['http:', 'https:'];
    return safeProtocols.includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Post-processes inline content to clean up and optimize
 */
function postProcessInlineContent(
  content: InlineContent[], 
  config: InlineParseConfig
): InlineContent[] {
  let processed = [...content];

  // Remove empty text spans
  processed = processed.filter(item => {
    return !(item.type === 'text' && !item.text.trim());
  });

  // Merge adjacent text spans with the same formatting
  if (config.mergeAdjacentText) {
    processed = mergeAdjacentTextSpans(processed);
  }

  return processed;
}

/**
 * Merges adjacent text spans that have identical formatting
 */
function mergeAdjacentTextSpans(content: InlineContent[]): InlineContent[] {
  const merged: InlineContent[] = [];
  
  for (const item of content) {
    if (item.type === 'text' && merged.length > 0) {
      const lastItem = merged[merged.length - 1];
      
      if (lastItem.type === 'text' && 
          formattingEquals(item.formatting, lastItem.formatting)) {
        // Merge with previous text span
        lastItem.text += item.text;
        continue;
      }
    }
    
    merged.push(item);
  }
  
  return merged;
}

/**
 * Compares two formatting objects for equality
 */
function formattingEquals(
  a: TextFormatting | undefined, 
  b: TextFormatting | undefined
): boolean {
  // Both undefined
  if (!a && !b) return true;
  
  // One undefined, one not
  if (!a || !b) return false;
  
  // Compare each property
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  
  for (const key of keys) {
    if (a[key as keyof TextFormatting] !== b[key as keyof TextFormatting]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Utility function to create a simple text span
 */
export function createTextSpan(text: string, formatting?: TextFormatting): TextSpan {
  return {
    type: 'text',
    text,
    formatting: formatting && hasAnyFormatting(formatting) ? formatting : undefined
  };
}

/**
 * Utility function to create a link span
 */
export function createLinkSpan(url: string, text: string, formatting?: TextFormatting): LinkSpan {
  return {
    type: 'link',
    url,
    text,
    formatting: formatting && hasAnyFormatting(formatting) ? formatting : undefined
  };
}

/**
 * Utility function to create a line break
 */
export function createLineBreak(): LineBreak {
  return {
    type: 'linebreak'
  };
}