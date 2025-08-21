/**
 * Content validation utilities for ClippyContent
 * 
 * This module provides validation functions to ensure ClippyContent
 * maintains structural integrity and prevents malformed content
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
  ListItem,
  TextFormatting
} from './types';

/**
 * Maximum content sizes to prevent memory issues
 */
export const CONTENT_LIMITS = {
  MAX_BLOCKS: 1000,
  MAX_TEXT_LENGTH: 50000,
  MAX_NESTING_LEVEL: 10,
  MAX_LIST_ITEMS: 500,
  MAX_URL_LENGTH: 2000,
} as const;

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a complete ClippyContent object
 */
export function validateClippyContent(content: unknown): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!content || typeof content !== 'object') {
    result.isValid = false;
    result.errors.push('Content must be an object');
    return result;
  }

  const clippyContent = content as ClippyContent;

  // Check required fields
  if (clippyContent.version !== '1.0') {
    result.isValid = false;
    result.errors.push('Invalid version - must be "1.0"');
  }

  if (!Array.isArray(clippyContent.blocks)) {
    result.isValid = false;
    result.errors.push('Blocks must be an array');
    return result;
  }

  // Check block count limits
  if (clippyContent.blocks.length > CONTENT_LIMITS.MAX_BLOCKS) {
    result.isValid = false;
    result.errors.push(`Too many blocks - maximum ${CONTENT_LIMITS.MAX_BLOCKS} allowed`);
  }

  // Validate each block
  clippyContent.blocks.forEach((block, index) => {
    const blockResult = validateContentBlock(block);
    if (!blockResult.isValid) {
      result.isValid = false;
      blockResult.errors.forEach(error => {
        result.errors.push(`Block ${index}: ${error}`);
      });
    }
    blockResult.warnings.forEach(warning => {
      result.warnings.push(`Block ${index}: ${warning}`);
    });
  });

  // Check for duplicate block IDs
  const blockIds = clippyContent.blocks.map(block => block.id).filter(Boolean);
  const uniqueIds = new Set(blockIds);
  if (blockIds.length !== uniqueIds.size) {
    result.isValid = false;
    result.errors.push('Duplicate block IDs found');
  }

  // Validate metadata if present
  if (clippyContent.metadata) {
    if (clippyContent.metadata.sourceUrl && clippyContent.metadata.sourceUrl.length > CONTENT_LIMITS.MAX_URL_LENGTH) {
      result.warnings.push('Source URL is very long');
    }
    
    if (clippyContent.metadata.capturedAt && !isValidISODate(clippyContent.metadata.capturedAt)) {
      result.warnings.push('Invalid capturedAt date format');
    }
  }

  return result;
}

/**
 * Validates a content block
 */
export function validateContentBlock(block: unknown): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!block || typeof block !== 'object') {
    result.isValid = false;
    result.errors.push('Block must be an object');
    return result;
  }

  const contentBlock = block as ContentBlock;

  // Check required fields
  if (!contentBlock.id || typeof contentBlock.id !== 'string') {
    result.isValid = false;
    result.errors.push('Block must have a valid id');
  }

  if (!contentBlock.type || typeof contentBlock.type !== 'string') {
    result.isValid = false;
    result.errors.push('Block must have a valid type');
    return result;
  }

  // Validate specific block types
  switch (contentBlock.type) {
    case 'paragraph':
      return validateParagraphBlock(contentBlock as ParagraphBlock);
    case 'heading':
      return validateHeadingBlock(contentBlock as HeadingBlock);
    case 'list':
      return validateListBlock(contentBlock as ListBlock);
    case 'quote':
      return validateQuoteBlock(contentBlock as QuoteBlock);
    case 'code':
      return validateCodeBlock(contentBlock as CodeBlock);
    case 'divider':
      return validateDividerBlock(contentBlock as DividerBlock);
    default:
      result.isValid = false;
      result.errors.push(`Unknown block type: ${(contentBlock as any).type}`);
  }

  return result;
}

/**
 * Validates a paragraph block
 */
function validateParagraphBlock(block: ParagraphBlock): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!Array.isArray(block.content)) {
    result.isValid = false;
    result.errors.push('Paragraph content must be an array');
    return result;
  }

  // Validate inline content
  block.content.forEach((inline, index) => {
    const inlineResult = validateInlineContent(inline);
    if (!inlineResult.isValid) {
      result.isValid = false;
      inlineResult.errors.forEach(error => {
        result.errors.push(`Inline ${index}: ${error}`);
      });
    }
  });

  return result;
}

/**
 * Validates a heading block
 */
function validateHeadingBlock(block: HeadingBlock): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!Array.isArray(block.content)) {
    result.isValid = false;
    result.errors.push('Heading content must be an array');
    return result;
  }

  if (![1, 2, 3, 4, 5, 6].includes(block.level)) {
    result.isValid = false;
    result.errors.push('Heading level must be 1-6');
  }

  // Validate inline content
  block.content.forEach((inline, index) => {
    const inlineResult = validateInlineContent(inline);
    if (!inlineResult.isValid) {
      result.isValid = false;
      inlineResult.errors.forEach(error => {
        result.errors.push(`Inline ${index}: ${error}`);
      });
    }
  });

  return result;
}

/**
 * Validates a list block with nesting level tracking
 */
function validateListBlock(block: ListBlock, nestingLevel: number = 0): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (nestingLevel > CONTENT_LIMITS.MAX_NESTING_LEVEL) {
    result.isValid = false;
    result.errors.push(`List nesting too deep - maximum ${CONTENT_LIMITS.MAX_NESTING_LEVEL} levels`);
    return result;
  }

  if (!['bulleted', 'numbered'].includes(block.listType)) {
    result.isValid = false;
    result.errors.push('List type must be "bulleted" or "numbered"');
  }

  if (!Array.isArray(block.items)) {
    result.isValid = false;
    result.errors.push('List items must be an array');
    return result;
  }

  if (block.items.length > CONTENT_LIMITS.MAX_LIST_ITEMS) {
    result.warnings.push(`Many list items - ${block.items.length} items`);
  }

  // Validate list items
  block.items.forEach((item, index) => {
    const itemResult = validateListItem(item, nestingLevel);
    if (!itemResult.isValid) {
      result.isValid = false;
      itemResult.errors.forEach(error => {
        result.errors.push(`Item ${index}: ${error}`);
      });
    }
  });

  return result;
}

/**
 * Validates a list item
 */
function validateListItem(item: ListItem, nestingLevel: number): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!item.id || typeof item.id !== 'string') {
    result.isValid = false;
    result.errors.push('List item must have a valid id');
  }

  if (!Array.isArray(item.content)) {
    result.isValid = false;
    result.errors.push('List item content must be an array');
    return result;
  }

  // Validate inline content
  item.content.forEach((inline, index) => {
    const inlineResult = validateInlineContent(inline);
    if (!inlineResult.isValid) {
      result.isValid = false;
      inlineResult.errors.forEach(error => {
        result.errors.push(`Inline ${index}: ${error}`);
      });
    }
  });

  // Validate nested list if present
  if (item.nested) {
    const nestedResult = validateListBlock(item.nested, nestingLevel + 1);
    if (!nestedResult.isValid) {
      result.isValid = false;
      nestedResult.errors.forEach(error => {
        result.errors.push(`Nested: ${error}`);
      });
    }
  }

  return result;
}

/**
 * Validates a quote block
 */
function validateQuoteBlock(block: QuoteBlock): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!Array.isArray(block.content)) {
    result.isValid = false;
    result.errors.push('Quote content must be an array');
    return result;
  }

  // Validate inline content
  block.content.forEach((inline, index) => {
    const inlineResult = validateInlineContent(inline);
    if (!inlineResult.isValid) {
      result.isValid = false;
      inlineResult.errors.forEach(error => {
        result.errors.push(`Inline ${index}: ${error}`);
      });
    }
  });

  if (block.citation && block.citation.length > 500) {
    result.warnings.push('Very long citation');
  }

  return result;
}

/**
 * Validates a code block
 */
function validateCodeBlock(block: CodeBlock): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (typeof block.content !== 'string') {
    result.isValid = false;
    result.errors.push('Code content must be a string');
  }

  if (block.content && block.content.length > CONTENT_LIMITS.MAX_TEXT_LENGTH) {
    result.warnings.push('Very long code block');
  }

  if (block.language && typeof block.language !== 'string') {
    result.warnings.push('Language should be a string');
  }

  return result;
}

/**
 * Validates a divider block
 */
function validateDividerBlock(block: DividerBlock): ValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: []
  };
}

/**
 * Validates inline content
 */
function validateInlineContent(inline: unknown): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!inline || typeof inline !== 'object') {
    result.isValid = false;
    result.errors.push('Inline content must be an object');
    return result;
  }

  const inlineContent = inline as InlineContent;

  switch (inlineContent.type) {
    case 'text':
      return validateTextSpan(inlineContent as TextSpan);
    case 'link':
      return validateLinkSpan(inlineContent as LinkSpan);
    case 'linebreak':
      return { isValid: true, errors: [], warnings: [] };
    default:
      result.isValid = false;
      result.errors.push(`Unknown inline type: ${(inlineContent as any).type}`);
  }

  return result;
}

/**
 * Validates a text span
 */
function validateTextSpan(span: TextSpan): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (typeof span.text !== 'string') {
    result.isValid = false;
    result.errors.push('Text span must have text string');
  }

  if (span.text && span.text.length > CONTENT_LIMITS.MAX_TEXT_LENGTH) {
    result.warnings.push('Very long text span');
  }

  if (span.formatting) {
    const formattingResult = validateTextFormatting(span.formatting);
    if (!formattingResult.isValid) {
      result.isValid = false;
      result.errors.push(...formattingResult.errors);
    }
  }

  return result;
}

/**
 * Validates a link span
 */
function validateLinkSpan(span: LinkSpan): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (typeof span.url !== 'string' || !span.url) {
    result.isValid = false;
    result.errors.push('Link span must have valid URL');
  }

  if (typeof span.text !== 'string') {
    result.isValid = false;
    result.errors.push('Link span must have text string');
  }

  if (span.url && span.url.length > CONTENT_LIMITS.MAX_URL_LENGTH) {
    result.warnings.push('Very long URL');
  }

  if (span.url && !isValidUrl(span.url)) {
    result.warnings.push('URL format appears invalid');
  }

  if (span.formatting) {
    const formattingResult = validateTextFormatting(span.formatting);
    if (!formattingResult.isValid) {
      result.isValid = false;
      result.errors.push(...formattingResult.errors);
    }
  }

  return result;
}

/**
 * Validates text formatting
 */
function validateTextFormatting(formatting: TextFormatting): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  const validProps = ['bold', 'italic', 'underline', 'strikethrough', 'code'];
  
  Object.keys(formatting).forEach(key => {
    if (!validProps.includes(key)) {
      result.warnings.push(`Unknown formatting property: ${key}`);
    }
    
    if (typeof formatting[key as keyof TextFormatting] !== 'boolean') {
      result.isValid = false;
      result.errors.push(`Formatting property ${key} must be boolean`);
    }
  });

  return result;
}

/**
 * Utility function to check if a string is a valid ISO date
 */
function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString();
}

/**
 * Utility function to check if a string is a valid URL
 */
function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes and fixes common issues in ClippyContent
 */
export function sanitizeClippyContent(content: ClippyContent): ClippyContent {
  const sanitized: ClippyContent = {
    version: "1.0",
    blocks: [],
    metadata: content.metadata ? { ...content.metadata } : undefined
  };

  // Ensure block count doesn't exceed limits
  const blocksToProcess = content.blocks.slice(0, CONTENT_LIMITS.MAX_BLOCKS);

  sanitized.blocks = blocksToProcess.map((block, index) => {
    const sanitizedBlock = { ...block };
    
    // Ensure all blocks have IDs
    if (!sanitizedBlock.id) {
      sanitizedBlock.id = `block-${Date.now()}-${index}`;
    }

    return sanitizedBlock;
  });

  return sanitized;
}