/**
 * Markdown renderer for converting ClippyContent to Markdown format
 * 
 * This renderer converts semantic ClippyContent blocks to Markdown
 * for platforms like Discord, Slack, GitHub, and other Markdown-based editors
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
 * Markdown rendering configuration
 */
export interface MarkdownRenderConfig {
  flavor: 'github' | 'discord' | 'slack' | 'standard';
  preserveFormatting: boolean;
  useCodeFences: boolean;
  maxNestingLevel: number;
  lineBreakStyle: 'soft' | 'hard';
}

/**
 * Default Markdown rendering configuration
 */
export const DEFAULT_MARKDOWN_CONFIG: MarkdownRenderConfig = {
  flavor: 'standard',
  preserveFormatting: true,
  useCodeFences: true,
  maxNestingLevel: 5,
  lineBreakStyle: 'soft'
};

/**
 * Platform-specific configurations
 */
export const PLATFORM_MARKDOWN_CONFIGS: Record<string, Partial<MarkdownRenderConfig>> = {
  github: {
    flavor: 'github',
    useCodeFences: true,
    lineBreakStyle: 'soft'
  },
  discord: {
    flavor: 'discord',
    useCodeFences: true,
    lineBreakStyle: 'soft'
  },
  slack: {
    flavor: 'slack',
    useCodeFences: false,
    lineBreakStyle: 'hard'
  }
};

/**
 * Main function to render ClippyContent as Markdown
 */
export function renderClippyContentToMarkdown(
  content: ClippyContent,
  config: Partial<MarkdownRenderConfig> = {}
): string {
  const fullConfig = { ...DEFAULT_MARKDOWN_CONFIG, ...config };
  
  if (!content || !content.blocks || content.blocks.length === 0) {
    return '';
  }

  const markdown = content.blocks
    .map(block => renderContentBlock(block, fullConfig, 0))
    .filter(md => md.trim()) // Remove empty blocks
    .join('\n\n');

  return postProcessMarkdown(markdown, fullConfig);
}

/**
 * Renders a single content block to Markdown
 */
function renderContentBlock(
  block: ContentBlock, 
  config: MarkdownRenderConfig, 
  depth: number = 0
): string {
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
      console.warn(`[Markdown Renderer] Unknown block type: ${(block as any).type}`);
      return '';
  }
}

/**
 * Renders a paragraph block
 */
function renderParagraphBlock(block: ParagraphBlock, config: MarkdownRenderConfig): string {
  return renderInlineContent(block.content, config);
}

/**
 * Renders a heading block
 */
function renderHeadingBlock(block: HeadingBlock, config: MarkdownRenderConfig): string {
  const content = renderInlineContent(block.content, config);
  const hashes = '#'.repeat(block.level);
  return `${hashes} ${content}`;
}

/**
 * Renders a list block
 */
function renderListBlock(
  block: ListBlock, 
  config: MarkdownRenderConfig, 
  depth: number = 0
): string {
  if (depth >= config.maxNestingLevel) {
    console.warn(`[Markdown Renderer] Maximum nesting level (${config.maxNestingLevel}) exceeded`);
    return renderListAsPlainText(block, config);
  }

  const lines: string[] = [];
  
  for (let i = 0; i < block.items.length; i++) {
    const item = block.items[i];
    const lineContent = renderListItem(item, block.listType, i + 1, config, depth);
    lines.push(lineContent);
  }

  return lines.join('\n');
}

/**
 * Renders a list item
 */
function renderListItem(
  item: ListItem,
  listType: 'bulleted' | 'numbered',
  index: number,
  config: MarkdownRenderConfig,
  depth: number
): string {
  const indent = '  '.repeat(depth); // 2 spaces per level
  const content = renderInlineContent(item.content, config);
  
  let prefix: string;
  if (listType === 'numbered') {
    prefix = `${index}.`;
  } else {
    // Use different bullet styles for different depths
    const bullets = ['*', '-', '+'];
    prefix = bullets[depth % bullets.length];
  }

  let line = `${indent}${prefix} ${content}`;

  // Handle nested lists
  if (item.nested) {
    const nestedContent = renderListBlock(item.nested, config, depth + 1);
    if (nestedContent.trim()) {
      line += '\n' + nestedContent;
    }
  }

  return line;
}

/**
 * Renders a quote block
 */
function renderQuoteBlock(block: QuoteBlock, config: MarkdownRenderConfig): string {
  const content = renderInlineContent(block.content, config);
  
  // Split content into lines and prefix each with >
  const lines = content.split('\n').map(line => `> ${line}`);
  
  let quote = lines.join('\n');
  
  // Add citation if present
  if (block.citation) {
    quote += `\n>\n> — ${block.citation}`;
  }
  
  return quote;
}

/**
 * Renders a code block
 */
function renderCodeBlock(block: CodeBlock, config: MarkdownRenderConfig): string {
  if (config.useCodeFences) {
    const language = block.language || '';
    return `\`\`\`${language}\n${block.content}\n\`\`\``;
  } else {
    // Use indented code blocks (4 spaces)
    const lines = block.content.split('\n').map(line => `    ${line}`);
    return lines.join('\n');
  }
}

/**
 * Renders a divider block
 */
function renderDividerBlock(block: DividerBlock, config: MarkdownRenderConfig): string {
  switch (config.flavor) {
    case 'discord':
      return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'; // Discord-style divider
    case 'slack':
      return '---'; // Simple dashes for Slack
    default:
      return '---'; // Standard Markdown horizontal rule
  }
}

/**
 * Renders inline content to Markdown
 */
function renderInlineContent(content: InlineContent[], config: MarkdownRenderConfig): string {
  return content
    .map(inline => renderInlineElement(inline, config))
    .join('');
}

/**
 * Renders a single inline element to Markdown
 */
function renderInlineElement(inline: InlineContent, config: MarkdownRenderConfig): string {
  switch (inline.type) {
    case 'text':
      return renderTextSpan(inline, config);
    case 'link':
      return renderLinkSpan(inline, config);
    case 'linebreak':
      return renderLineBreak(config);
    default:
      console.warn(`[Markdown Renderer] Unknown inline type: ${(inline as any).type}`);
      return '';
  }
}

/**
 * Renders a text span with formatting
 */
function renderTextSpan(span: TextSpan, config: MarkdownRenderConfig): string {
  let content = escapeMarkdown(span.text, config);
  
  if (!config.preserveFormatting || !span.formatting) {
    return content;
  }

  // Apply formatting (order matters for nested formatting)
  if (span.formatting.code) {
    content = `\`${content}\``;
  }
  
  if (span.formatting.bold) {
    content = `**${content}**`;
  }
  
  if (span.formatting.italic) {
    content = `*${content}*`;
  }
  
  if (span.formatting.strikethrough) {
    if (config.flavor === 'slack') {
      content = `~${content}~`;
    } else {
      content = `~~${content}~~`;
    }
  }
  
  if (span.formatting.underline) {
    if (config.flavor === 'discord') {
      content = `__${content}__`;
    } else {
      // Most Markdown flavors don't support underline, fallback to emphasis
      content = `*${content}*`;
    }
  }

  return content;
}

/**
 * Renders a link span
 */
function renderLinkSpan(span: LinkSpan, config: MarkdownRenderConfig): string {
  let linkText = escapeMarkdown(span.text, config);
  
  // Apply formatting to link text if present
  if (config.preserveFormatting && span.formatting) {
    if (span.formatting.bold) {
      linkText = `**${linkText}**`;
    }
    if (span.formatting.italic) {
      linkText = `*${linkText}*`;
    }
    if (span.formatting.strikethrough) {
      if (config.flavor === 'slack') {
        linkText = `~${linkText}~`;
      } else {
        linkText = `~~${linkText}~~`;
      }
    }
    // Note: code formatting and underline don't work well inside links
  }

  // Handle different link formats based on platform
  if (config.flavor === 'slack') {
    // Slack uses <url|text> format for custom link text
    if (span.text !== span.url) {
      return `<${span.url}|${linkText}>`;
    } else {
      return `<${span.url}>`;
    }
  } else {
    // Standard Markdown link format
    return `[${linkText}](${encodeMarkdownUrl(span.url)})`;
  }
}

/**
 * Renders a line break based on platform preferences
 */
function renderLineBreak(config: MarkdownRenderConfig): string {
  if (config.lineBreakStyle === 'hard') {
    return '\n';
  } else {
    return '  \n'; // Two spaces + newline for soft line break
  }
}

/**
 * Escapes Markdown special characters in text
 */
function escapeMarkdown(text: string, config: MarkdownRenderConfig): string {
  // Characters that need escaping in Markdown
  const escapeChars = ['\\', '`', '*', '_', '{', '}', '[', ']', '(', ')', '#', '+', '-', '.', '!'];
  
  let escaped = text;
  
  // Platform-specific escaping
  if (config.flavor === 'discord') {
    // Discord has some additional characters to escape
    escapeChars.push('~', '|');
  }
  
  // Escape each character
  for (const char of escapeChars) {
    escaped = escaped.replace(new RegExp('\\' + char, 'g'), '\\' + char);
  }
  
  return escaped;
}

/**
 * Encodes URLs for Markdown
 */
function encodeMarkdownUrl(url: string): string {
  // Encode parentheses and spaces in URLs
  return url
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/ /g, '%20');
}

/**
 * Renders a list as plain text when nesting limit is exceeded
 */
function renderListAsPlainText(block: ListBlock, config: MarkdownRenderConfig): string {
  return block.items
    .map(item => {
      const content = renderInlineContent(item.content, config);
      return `• ${content}`;
    })
    .join('\n');
}

/**
 * Post-processes Markdown for platform-specific optimizations
 */
function postProcessMarkdown(markdown: string, config: MarkdownRenderConfig): string {
  let processed = markdown;

  // Platform-specific post-processing
  switch (config.flavor) {
    case 'discord':
      processed = optimizeForDiscord(processed);
      break;
    case 'slack':
      processed = optimizeForSlack(processed);
      break;
    case 'github':
      processed = optimizeForGitHub(processed);
      break;
  }

  // General cleanup
  processed = processed
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines to 2
    .trim(); // Remove leading/trailing whitespace

  return processed;
}

/**
 * Optimizes Markdown for Discord
 */
function optimizeForDiscord(markdown: string): string {
  // Discord-specific optimizations
  return markdown
    .replace(/^#{1,6} /gm, '**') // Convert headers to bold (Discord doesn't support # headers)
    .replace(/(\*\*.*?\*\*)/gm, '$1'); // Ensure bold formatting is preserved
}

/**
 * Optimizes Markdown for Slack
 */
function optimizeForSlack(markdown: string): string {
  // Slack-specific optimizations
  return markdown
    .replace(/^#{1,6} (.*?)$/gm, '*$1*') // Convert headers to bold
    .replace(/\*\*(.*?)\*\*/g, '*$1*') // Convert ** to * for bold
    .replace(/\*(.*?)\*/g, '_$1_'); // Convert * to _ for italic
}

/**
 * Optimizes Markdown for GitHub
 */
function optimizeForGitHub(markdown: string): string {
  // GitHub-specific optimizations (GitHub supports full Markdown)
  return markdown;
}

/**
 * Utility function to get a preview of Markdown content
 */
export function getMarkdownPreview(content: ClippyContent, maxLength: number = 100): string {
  const markdown = renderClippyContentToMarkdown(content, { 
    ...DEFAULT_MARKDOWN_CONFIG,
    preserveFormatting: false 
  });
  
  // Strip Markdown formatting for preview
  const plainText = markdown
    .replace(/[*_~`#\[\]()]/g, '') // Remove Markdown characters
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();
  
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  return plainText.substring(0, maxLength).trim() + '...';
}

/**
 * Utility function to render for a specific platform
 */
export function renderForPlatform(
  content: ClippyContent, 
  platform: 'github' | 'discord' | 'slack'
): string {
  const platformConfig = PLATFORM_MARKDOWN_CONFIGS[platform];
  return renderClippyContentToMarkdown(content, platformConfig);
}