/**
 * Universal content renderer for ClippyContent
 * 
 * This module provides a unified interface for rendering ClippyContent
 * to different formats based on platform detection and capabilities
 */

import type { ClippyContent, PlatformDetection } from './types';
import { detectPlatform, getPlatformCapabilities, getBestFormatForPlatform } from './platform-detection';
import { renderClippyContentToHTML, getPlainTextFromClippyContent } from './renderers/html-renderer';
import { renderClippyContentToQuillDelta, textToQuillDelta, type QuillDelta } from './renderers/quill-renderer';
import { renderClippyContentToMarkdown, renderForPlatform } from './renderers/markdown-renderer';

/**
 * Rendering options
 */
export interface RenderOptions {
  platformId?: string;
  format?: 'html' | 'markdown' | 'delta' | 'plaintext' | 'auto';
  preserveFormatting?: boolean;
  maxLength?: number;
  fallbackToPlainText?: boolean;
}

/**
 * Rendering result
 */
export interface RenderResult {
  content: string | QuillDelta;
  format: 'html' | 'markdown' | 'delta' | 'plaintext';
  platformId: string;
  success: boolean;
  warnings: string[];
}

/**
 * Main rendering function - automatically detects platform and chooses best format
 */
export function renderContent(
  clippyContent: ClippyContent,
  options: RenderOptions = {}
): RenderResult {
  const warnings: string[] = [];
  
  // Detect platform if not provided
  let platformId = options.platformId;
  if (!platformId) {
    const detection = detectPlatform();
    platformId = detection.platformId;
    
    if (detection.confidence < 0.5) {
      warnings.push(`Low confidence platform detection: ${detection.confidence}`);
    }
  }

  // Determine the best format
  let targetFormat = options.format;
  if (!targetFormat || targetFormat === 'auto') {
    targetFormat = getBestFormatForPlatform(platformId);
  }

  // Get platform capabilities for validation
  const capabilities = getPlatformCapabilities(platformId);

  try {
    // Render based on target format
    switch (targetFormat) {
      case 'html':
        const htmlContent = renderToHTML(clippyContent, platformId, options);
        return {
          content: htmlContent,
          format: 'html',
          platformId,
          success: true,
          warnings
        };

      case 'delta':
        const deltaContent = renderToDelta(clippyContent, platformId, options);
        return {
          content: deltaContent,
          format: 'delta',
          platformId,
          success: true,
          warnings
        };

      case 'markdown':
        const markdownContent = renderToMarkdown(clippyContent, platformId, options);
        return {
          content: markdownContent,
          format: 'markdown',
          platformId,
          success: true,
          warnings
        };

      case 'plaintext':
        const plainContent = renderToPlainText(clippyContent, options);
        return {
          content: plainContent,
          format: 'plaintext',
          platformId,
          success: true,
          warnings
        };

      default:
        throw new Error(`Unsupported format: ${targetFormat}`);
    }
  } catch (error) {
    console.error('[Content Renderer] Error rendering content:', error);
    
    // Fallback to plain text if enabled
    if (options.fallbackToPlainText !== false) {
      const plainContent = renderToPlainText(clippyContent, options);
      warnings.push(`Rendering failed, falling back to plain text: ${error}`);
      
      return {
        content: plainContent,
        format: 'plaintext',
        platformId,
        success: false,
        warnings
      };
    }

    return {
      content: '',
      format: 'plaintext',
      platformId,
      success: false,
      warnings: [...warnings, `Rendering failed: ${error}`]
    };
  }
}

/**
 * Renders ClippyContent to HTML
 */
function renderToHTML(
  content: ClippyContent,
  platformId: string,
  options: RenderOptions
): string {
  const config = {
    includeIds: false,
    cleanOutput: true,
    preserveWhitespace: false,
    useSemanticElements: true,
    sanitizeUrls: true
  };

  const html = renderClippyContentToHTML(content, config);

  // Apply length limit if specified
  if (options.maxLength && html.length > options.maxLength) {
    const plainText = getPlainTextFromClippyContent(content);
    if (plainText.length <= options.maxLength) {
      return `<p>${escapeHTML(plainText)}</p>`;
    } else {
      return `<p>${escapeHTML(plainText.substring(0, options.maxLength))}...</p>`;
    }
  }

  return html;
}

/**
 * Renders ClippyContent to Quill Delta
 */
function renderToDelta(
  content: ClippyContent,
  platformId: string,
  options: RenderOptions
): QuillDelta {
  const config = {
    supportNestedLists: true,
    maxListDepth: 3,
    preserveFormatting: options.preserveFormatting !== false,
    useCodeBlocks: true
  };

  const delta = renderClippyContentToQuillDelta(content, config);

  // Apply length limit if specified (approximate)
  if (options.maxLength) {
    const text = delta.ops.map(op => typeof op.insert === 'string' ? op.insert : '').join('');
    if (text.length > options.maxLength) {
      const truncatedText = text.substring(0, options.maxLength) + '...';
      return textToQuillDelta(truncatedText);
    }
  }

  return delta;
}

/**
 * Renders ClippyContent to Markdown
 */
function renderToMarkdown(
  content: ClippyContent,
  platformId: string,
  options: RenderOptions
): string {
  // Map platform IDs to Markdown flavors
  const platformToFlavor: Record<string, 'github' | 'discord' | 'slack'> = {
    'github': 'github',
    'discord': 'discord',
    'slack': 'slack'
  };

  const flavor = platformToFlavor[platformId];
  
  let markdown: string;
  if (flavor) {
    markdown = renderForPlatform(content, flavor);
  } else {
    markdown = renderClippyContentToMarkdown(content, {
      preserveFormatting: options.preserveFormatting !== false
    });
  }

  // Apply length limit if specified
  if (options.maxLength && markdown.length > options.maxLength) {
    const plainText = getPlainTextFromClippyContent(content);
    if (plainText.length <= options.maxLength) {
      return plainText;
    } else {
      return plainText.substring(0, options.maxLength) + '...';
    }
  }

  return markdown;
}

/**
 * Renders ClippyContent to plain text
 */
function renderToPlainText(
  content: ClippyContent,
  options: RenderOptions
): string {
  let plainText = getPlainTextFromClippyContent(content);

  // Apply length limit if specified
  if (options.maxLength && plainText.length > options.maxLength) {
    plainText = plainText.substring(0, options.maxLength) + '...';
  }

  return plainText;
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
 * Gets the best rendering format for current context
 */
export function getBestRenderingFormat(): 'html' | 'markdown' | 'delta' | 'plaintext' {
  const detection = detectPlatform();
  return getBestFormatForPlatform(detection.platformId);
}

/**
 * Renders content for preview purposes (always plain text)
 */
export function renderPreview(
  content: ClippyContent,
  maxLength: number = 100
): string {
  const plainText = getPlainTextFromClippyContent(content);
  
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  return plainText.substring(0, maxLength).trim() + '...';
}

/**
 * Validates if content can be rendered for a specific platform
 */
export function validateContentForPlatform(
  content: ClippyContent,
  platformId: string
): { valid: boolean; warnings: string[]; unsupportedFeatures: string[] } {
  const capabilities = getPlatformCapabilities(platformId);
  const warnings: string[] = [];
  const unsupportedFeatures: string[] = [];

  // Check each block for platform compatibility
  for (const block of content.blocks) {
    if (!capabilities.supportedBlocks.includes(block.type)) {
      unsupportedFeatures.push(`Block type: ${block.type}`);
    }

    // Check formatting within blocks
    if ('content' in block && Array.isArray(block.content)) {
      for (const inline of block.content) {
        if (inline.type === 'text' || inline.type === 'link') {
          if (inline.formatting) {
            for (const [format, enabled] of Object.entries(inline.formatting)) {
              if (enabled && !capabilities.supportedFormatting.includes(format as any)) {
                unsupportedFeatures.push(`Text formatting: ${format}`);
              }
            }
          }
        }
        
        if (inline.type === 'link' && !capabilities.hasLinkSupport) {
          unsupportedFeatures.push('Links');
        }
      }
    }

    // Check code block language support
    if (block.type === 'code' && block.language && !capabilities.hasCodeSyntaxHighlighting) {
      warnings.push(`Syntax highlighting not supported for language: ${block.language}`);
    }

    // Check list nesting
    if (block.type === 'list') {
      const maxDepth = getListDepth(block);
      if (maxDepth > (capabilities.maxNestingLevel || 1)) {
        warnings.push(`List nesting exceeds platform limit: ${maxDepth} > ${capabilities.maxNestingLevel}`);
      }
    }
  }

  return {
    valid: unsupportedFeatures.length === 0,
    warnings,
    unsupportedFeatures: Array.from(new Set(unsupportedFeatures))
  };
}

/**
 * Gets the maximum nesting depth of a list block
 */
function getListDepth(block: any, currentDepth: number = 1): number {
  if (block.type !== 'list' || !block.items) {
    return currentDepth;
  }

  let maxDepth = currentDepth;
  
  for (const item of block.items) {
    if (item.nested) {
      const nestedDepth = getListDepth(item.nested, currentDepth + 1);
      maxDepth = Math.max(maxDepth, nestedDepth);
    }
  }

  return maxDepth;
}

/**
 * Batch renders multiple ClippyContent objects
 */
export function batchRender(
  contents: ClippyContent[],
  options: RenderOptions = {}
): RenderResult[] {
  return contents.map(content => renderContent(content, options));
}

/**
 * Renders content and automatically applies it to the current focused element
 */
export async function renderAndApply(
  content: ClippyContent,
  options: RenderOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = renderContent(content, options);
    
    if (!result.success) {
      return { success: false, error: result.warnings.join(', ') };
    }

    // Get the currently focused editable element
    const activeElement = document.activeElement;
    
    if (!activeElement) {
      return { success: false, error: 'No active element found' };
    }

    // Apply content based on element type and format
    if (result.format === 'delta' && (window as any).Quill) {
      // Try to find Quill instance
      const quillInstance = (activeElement as any).__quill;
      if (quillInstance) {
        quillInstance.setContents(result.content);
        return { success: true };
      }
    }

    if (activeElement.tagName.toLowerCase() === 'textarea') {
      // Plain textarea
      (activeElement as HTMLTextAreaElement).value = result.content as string;
      return { success: true };
    }

    if (activeElement.getAttribute('contenteditable') === 'true') {
      // ContentEditable element
      if (result.format === 'html') {
        (activeElement as HTMLElement).innerHTML = result.content as string;
      } else {
        (activeElement as HTMLElement).textContent = result.content as string;
      }
      return { success: true };
    }

    return { success: false, error: 'Unsupported element type' };
  } catch (error) {
    return { success: false, error: `Rendering failed: ${error}` };
  }
}