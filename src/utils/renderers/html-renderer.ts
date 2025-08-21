/**
 * HTML renderer for converting ClippyContent to HTML
 * 
 * This renderer converts semantic ClippyContent blocks back to clean,
 * cross-platform compatible HTML for ContentEditable elements
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
 * HTML rendering configuration
 */
export interface HTMLRenderConfig {
  includeIds: boolean;
  cleanOutput: boolean;
  preserveWhitespace: boolean;
  useSemanticElements: boolean;
  sanitizeUrls: boolean;
}

/**
 * Default HTML rendering configuration
 */
export const DEFAULT_HTML_CONFIG: HTMLRenderConfig = {
  includeIds: false,
  cleanOutput: true,
  preserveWhitespace: false,
  useSemanticElements: true,
  sanitizeUrls: true
};

/**
 * Main function to render ClippyContent as HTML
 */
export function renderClippyContentToHTML(
  content: ClippyContent,
  config: Partial<HTMLRenderConfig> = {}
): string {
  const fullConfig = { ...DEFAULT_HTML_CONFIG, ...config };
  
  if (!content || !content.blocks || content.blocks.length === 0) {
    return '';
  }

  const html = content.blocks
    .map(block => renderContentBlock(block, fullConfig))
    .filter(html => html.trim()) // Remove empty blocks
    .join('\n');

  return fullConfig.cleanOutput ? cleanHTML(html) : html;
}

/**
 * Renders a single content block to HTML
 */
function renderContentBlock(block: ContentBlock, config: HTMLRenderConfig): string {
  switch (block.type) {
    case 'paragraph':
      return renderParagraphBlock(block, config);
    case 'heading':
      return renderHeadingBlock(block, config);
    case 'list':
      return renderListBlock(block, config);
    case 'quote':
      return renderQuoteBlock(block, config);
    case 'code':
      return renderCodeBlock(block, config);
    case 'divider':
      return renderDividerBlock(block, config);
    default:
      console.warn(`[HTML Renderer] Unknown block type: ${(block as any).type}`);
      return '';
  }
}

/**
 * Renders a paragraph block
 */
function renderParagraphBlock(block: ParagraphBlock, config: HTMLRenderConfig): string {
  const content = renderInlineContent(block.content, config);
  const id = config.includeIds && block.id ? ` id="${escapeAttribute(block.id)}"` : '';
  
  return `<p${id}>${content}</p>`;
}

/**
 * Renders a heading block
 */
function renderHeadingBlock(block: HeadingBlock, config: HTMLRenderConfig): string {
  const content = renderInlineContent(block.content, config);
  const tag = `h${block.level}`;
  const id = config.includeIds && block.id ? ` id="${escapeAttribute(block.id)}"` : '';
  
  return `<${tag}${id}>${content}</${tag}>`;
}

/**
 * Renders a list block
 */
function renderListBlock(block: ListBlock, config: HTMLRenderConfig): string {
  const tag = block.listType === 'numbered' ? 'ol' : 'ul';
  const id = config.includeIds && block.id ? ` id="${escapeAttribute(block.id)}"` : '';
  
  const items = block.items
    .map(item => renderListItem(item, config))
    .filter(html => html.trim())
    .join('\n');

  if (!items.trim()) {
    return '';
  }

  return `<${tag}${id}>\n${items}\n</${tag}>`;
}

/**
 * Renders a list item
 */
function renderListItem(item: ListItem, config: HTMLRenderConfig): string {
  const content = renderInlineContent(item.content, config);
  const id = config.includeIds && item.id ? ` id="${escapeAttribute(item.id)}"` : '';
  
  let html = `<li${id}>${content}`;
  
  // Add nested list if present
  if (item.nested) {
    const nestedHtml = renderListBlock(item.nested, config);
    if (nestedHtml.trim()) {
      html += `\n${nestedHtml}`;
    }
  }
  
  html += '</li>';
  
  return html;
}

/**
 * Renders a quote block
 */
function renderQuoteBlock(block: QuoteBlock, config: HTMLRenderConfig): string {
  const content = renderInlineContent(block.content, config);
  const id = config.includeIds && block.id ? ` id="${escapeAttribute(block.id)}"` : '';
  const cite = block.citation ? ` cite="${escapeAttribute(block.citation)}"` : '';
  
  return `<blockquote${id}${cite}>${content}</blockquote>`;
}

/**
 * Renders a code block
 */
function renderCodeBlock(block: CodeBlock, config: HTMLRenderConfig): string {
  const content = escapeHTML(block.content);
  const id = config.includeIds && block.id ? ` id="${escapeAttribute(block.id)}"` : '';
  
  if (block.language) {
    const langClass = ` class="language-${escapeAttribute(block.language)}"`;
    return `<pre${id}><code${langClass}>${content}</code></pre>`;
  }
  
  return `<pre${id}><code>${content}</code></pre>`;
}

/**
 * Renders a divider block
 */
function renderDividerBlock(block: DividerBlock, config: HTMLRenderConfig): string {
  const id = config.includeIds && block.id ? ` id="${escapeAttribute(block.id)}"` : '';
  return `<hr${id}>`;
}

/**
 * Renders inline content to HTML
 */
function renderInlineContent(content: InlineContent[], config: HTMLRenderConfig): string {
  return content
    .map(inline => renderInlineElement(inline, config))
    .join('');
}

/**
 * Renders a single inline element to HTML
 */
function renderInlineElement(inline: InlineContent, config: HTMLRenderConfig): string {
  switch (inline.type) {
    case 'text':
      return renderTextSpan(inline, config);
    case 'link':
      return renderLinkSpan(inline, config);
    case 'linebreak':
      return '<br>';
    default:
      console.warn(`[HTML Renderer] Unknown inline type: ${(inline as any).type}`);
      return '';
  }
}

/**
 * Renders a text span with formatting
 */
function renderTextSpan(span: TextSpan, config: HTMLRenderConfig): string {
  let content = escapeHTML(span.text);
  
  if (!span.formatting) {
    return content;
  }

  // Apply formatting tags in order (inside to outside)
  if (span.formatting.code) {
    content = `<code>${content}</code>`;
  }
  
  if (span.formatting.bold) {
    const tag = config.useSemanticElements ? 'strong' : 'b';
    content = `<${tag}>${content}</${tag}>`;
  }
  
  if (span.formatting.italic) {
    const tag = config.useSemanticElements ? 'em' : 'i';
    content = `<${tag}>${content}</${tag}>`;
  }
  
  if (span.formatting.underline) {
    content = `<u>${content}</u>`;
  }
  
  if (span.formatting.strikethrough) {
    const tag = config.useSemanticElements ? 'del' : 's';
    content = `<${tag}>${content}</${tag}>`;
  }

  return content;
}

/**
 * Renders a link span
 */
function renderLinkSpan(span: LinkSpan, config: HTMLRenderConfig): string {
  const href = config.sanitizeUrls ? sanitizeUrl(span.url) : span.url;
  
  if (!href) {
    // Invalid URL - render as text
    return renderTextSpan({ type: 'text', text: span.text, formatting: span.formatting }, config);
  }

  let content = escapeHTML(span.text);
  
  // Apply formatting if present
  if (span.formatting) {
    if (span.formatting.code) {
      content = `<code>${content}</code>`;
    }
    if (span.formatting.bold) {
      const tag = config.useSemanticElements ? 'strong' : 'b';
      content = `<${tag}>${content}</${tag}>`;
    }
    if (span.formatting.italic) {
      const tag = config.useSemanticElements ? 'em' : 'i';
      content = `<${tag}>${content}</${tag}>`;
    }
    if (span.formatting.underline) {
      content = `<u>${content}</u>`;
    }
    if (span.formatting.strikethrough) {
      const tag = config.useSemanticElements ? 'del' : 's';
      content = `<${tag}>${content}</${tag}>`;
    }
  }

  return `<a href="${escapeAttribute(href)}">${content}</a>`;
}

/**
 * Escapes HTML special characters
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escapes HTML attribute values
 */
function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sanitizes URLs for security
 */
function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Allow relative URLs
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return url;
  }

  // Allow anchor links
  if (url.startsWith('#')) {
    return url;
  }

  // Allow mailto and tel links
  if (url.startsWith('mailto:') || url.startsWith('tel:')) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    const safeProtocols = ['http:', 'https:'];
    
    if (safeProtocols.includes(urlObj.protocol)) {
      return url;
    }
  } catch {
    // Invalid URL
  }

  return '';
}

/**
 * Cleans up HTML output
 */
function cleanHTML(html: string): string {
  return html
    .replace(/\n\s*\n/g, '\n') // Remove multiple consecutive newlines
    .replace(/^\s+|\s+$/g, '') // Trim start and end
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Utility function to render a single block for previews
 */
export function renderBlockPreview(block: ContentBlock, maxLength: number = 100): string {
  const html = renderContentBlock(block, { 
    ...DEFAULT_HTML_CONFIG, 
    cleanOutput: true,
    includeIds: false 
  });
  
  // Strip HTML tags for preview
  const text = html.replace(/<[^>]*>/g, '');
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Utility function to get plain text from ClippyContent
 */
export function getPlainTextFromClippyContent(content: ClippyContent): string {
  if (!content || !content.blocks) {
    return '';
  }

  return content.blocks
    .map(block => getPlainTextFromBlock(block))
    .filter(text => text.trim())
    .join('\n\n');
}

/**
 * Gets plain text from a single block
 */
function getPlainTextFromBlock(block: ContentBlock): string {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'quote':
      return getPlainTextFromInlineContent(block.content);
    
    case 'list':
      return block.items
        .map(item => {
          const text = getPlainTextFromInlineContent(item.content);
          const nested = item.nested ? '\n' + getPlainTextFromBlock(item.nested) : '';
          return `• ${text}${nested}`;
        })
        .join('\n');
    
    case 'code':
      return block.content;
    
    case 'divider':
      return '---';
    
    default:
      return '';
  }
}

/**
 * Gets plain text from inline content
 */
function getPlainTextFromInlineContent(content: InlineContent[]): string {
  return content
    .map(inline => {
      switch (inline.type) {
        case 'text':
          return inline.text;
        case 'link':
          return inline.text;
        case 'linebreak':
          return '\n';
        default:
          return '';
      }
    })
    .join('');
}