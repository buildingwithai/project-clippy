/**
 * Main integration utility for ClippyContent system
 * 
 * This module provides a unified interface for the Chrome extension
 * to use the new ClippyContent semantic model for 1:1 copy-paste
 */

import type { ClippyContent, Snippet } from './types';
import { parseHTMLToClippyContent, parseTextToClippyContent } from './block-parser';
import { renderContent, renderAndApply, type RenderOptions } from './content-renderer';
import { detectPlatform, getPlatformCapabilities } from './platform-detection';
import { validateClippyContent, sanitizeClippyContent } from './content-validation';

/**
 * Main ClippyContent processor class
 */
export class ClippyProcessor {
  /**
   * Processes captured content and converts it to ClippyContent
   */
  static async processContent(
    content: string,
    options: {
      format?: 'html' | 'text' | 'auto';
      sourceUrl?: string;
      sourceDomain?: string;
    } = {}
  ): Promise<ClippyContent> {
    const { format = 'auto', sourceUrl, sourceDomain } = options;

    let clippyContent: ClippyContent;

    // Determine format if auto
    let actualFormat = format;
    if (format === 'auto') {
      actualFormat = content.includes('<') && content.includes('>') ? 'html' : 'text';
    }

    // Parse content based on format
    if (actualFormat === 'html') {
      clippyContent = parseHTMLToClippyContent(content, { sourceUrl, sourceDomain });
    } else {
      clippyContent = parseTextToClippyContent(content, { sourceUrl, sourceDomain });
    }

    // Validate and sanitize
    const validation = validateClippyContent(clippyContent);
    if (!validation.isValid) {
      console.warn('[Clippy Processor] Content validation failed:', validation.errors);
      clippyContent = sanitizeClippyContent(clippyContent);
    }

    return clippyContent;
  }

  /**
   * Renders ClippyContent for the current platform
   */
  static async renderForCurrentPlatform(
    content: ClippyContent,
    options: Partial<RenderOptions> = {}
  ): Promise<string> {
    const detection = detectPlatform();
    
    const renderOptions: RenderOptions = {
      platformId: detection.platformId,
      format: 'auto',
      preserveFormatting: true,
      fallbackToPlainText: true,
      ...options
    };

    const result = renderContent(content, renderOptions);
    
    if (!result.success) {
      console.warn('[Clippy Processor] Rendering failed:', result.warnings);
    }

    return typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
  }

  /**
   * Applies ClippyContent to the currently focused element
   */
  static async applyToCurrentElement(
    content: ClippyContent,
    options: Partial<RenderOptions> = {}
  ): Promise<{ success: boolean; error?: string }> {
    return renderAndApply(content, options);
  }

  /**
   * Converts legacy snippet data to ClippyContent
   */
  static async migrateSnippet(snippet: Snippet): Promise<Snippet> {
    // Check if snippet already has ClippyContent
    if (snippet.clippyContent) {
      return snippet;
    }

    try {
      // Use current version data
      const currentVersion = snippet.versions?.[snippet.currentVersionIndex ?? 0] || snippet;
      const content = currentVersion.html || currentVersion.text;
      
      if (!content) {
        return snippet;
      }

      // Process the content
      const clippyContent = await this.processContent(content, {
        format: currentVersion.html ? 'html' : 'text',
        sourceUrl: snippet.sourceUrl,
        sourceDomain: snippet.sourceDomain
      });

      // Update snippet with ClippyContent
      const updatedSnippet = {
        ...snippet,
        clippyContent
      };

      // Also update the current version if it has versions array
      if (updatedSnippet.versions) {
        const updatedVersions = [...updatedSnippet.versions];
        const currentIndex = updatedSnippet.currentVersionIndex ?? 0;
        
        if (updatedVersions[currentIndex]) {
          updatedVersions[currentIndex] = {
            ...updatedVersions[currentIndex],
            clippyContent
          };
          updatedSnippet.versions = updatedVersions;
        }
      }

      return updatedSnippet;
    } catch (error) {
      console.error('[Clippy Processor] Migration failed for snippet:', snippet.id, error);
      return snippet;
    }
  }

  /**
   * Gets platform-specific paste format for a snippet
   */
  static async getPasteFormat(
    snippet: Snippet,
    platformId?: string
  ): Promise<{ content: string; format: string }> {
    // Use ClippyContent if available
    if (snippet.clippyContent) {
      const content = await this.renderForCurrentPlatform(snippet.clippyContent, { platformId });
      const detection = detectPlatform();
      const capabilities = getPlatformCapabilities(platformId || detection.platformId);
      
      return {
        content,
        format: capabilities.preferredFormat
      };
    }

    // Fallback to legacy format
    const currentVersion = snippet.versions?.[snippet.currentVersionIndex ?? 0] || snippet;
    
    return {
      content: currentVersion.html || currentVersion.text,
      format: currentVersion.html ? 'html' : 'text'
    };
  }

  /**
   * Validates if content is compatible with a specific platform
   */
  static validateForPlatform(
    content: ClippyContent,
    platformId: string
  ): { compatible: boolean; issues: string[] } {
    const capabilities = getPlatformCapabilities(platformId);
    const issues: string[] = [];

    // Check block type support
    for (const block of content.blocks) {
      if (!capabilities.supportedBlocks.includes(block.type)) {
        issues.push(`Unsupported block type: ${block.type}`);
      }
    }

    // Check formatting support
    const formatMap = {
      bold: 'bold',
      italic: 'italic',
      underline: 'underline',
      strikethrough: 'strikethrough',
      code: 'code'
    };

    for (const block of content.blocks) {
      if ('content' in block && Array.isArray(block.content)) {
        for (const inline of block.content) {
          if ((inline.type === 'text' || inline.type === 'link') && inline.formatting) {
            for (const [format, enabled] of Object.entries(inline.formatting)) {
              if (enabled && !capabilities.supportedFormatting.includes(format as any)) {
                issues.push(`Unsupported formatting: ${format}`);
              }
            }
          }
        }
      }
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }
}

/**
 * Convenience functions for common operations
 */

/**
 * Quickly converts HTML to ClippyContent
 */
export async function htmlToClippyContent(
  html: string,
  sourceUrl?: string
): Promise<ClippyContent> {
  return ClippyProcessor.processContent(html, { 
    format: 'html', 
    sourceUrl,
    sourceDomain: sourceUrl ? new URL(sourceUrl).hostname : undefined
  });
}

/**
 * Quickly converts text to ClippyContent
 */
export async function textToClippyContent(
  text: string,
  sourceUrl?: string
): Promise<ClippyContent> {
  return ClippyProcessor.processContent(text, { 
    format: 'text', 
    sourceUrl,
    sourceDomain: sourceUrl ? new URL(sourceUrl).hostname : undefined
  });
}

/**
 * Quickly pastes ClippyContent to current element
 */
export async function pasteClippyContent(
  content: ClippyContent
): Promise<{ success: boolean; error?: string }> {
  return ClippyProcessor.applyToCurrentElement(content);
}

/**
 * Creates a ClippyContent object from a snippet
 */
export async function snippetToClippyContent(snippet: Snippet): Promise<ClippyContent | null> {
  if (snippet.clippyContent) {
    return snippet.clippyContent;
  }

  const migratedSnippet = await ClippyProcessor.migrateSnippet(snippet);
  return migratedSnippet.clippyContent || null;
}

/**
 * Gets the best paste content for current platform
 */
export async function getBestPasteContent(snippet: Snippet): Promise<string> {
  const format = await ClippyProcessor.getPasteFormat(snippet);
  return format.content;
}

/**
 * Checks if current platform supports rich content
 */
export function currentPlatformSupportsRichContent(): boolean {
  const detection = detectPlatform();
  const capabilities = getPlatformCapabilities(detection.platformId);
  
  return capabilities.supportedBlocks.length > 1 || 
         capabilities.supportedFormatting.length > 0;
}

/**
 * Gets platform information for debugging
 */
export function getPlatformInfo(): {
  platform: string;
  editorType: string;
  capabilities: any;
  confidence: number;
} {
  const detection = detectPlatform();
  const capabilities = getPlatformCapabilities(detection.platformId);
  
  return {
    platform: detection.platformId,
    editorType: detection.editorType || 'unknown',
    capabilities,
    confidence: detection.confidence
  };
}