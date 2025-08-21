/**
 * Platform detection utilities for identifying website editors and capabilities
 * 
 * This module analyzes the current page to determine what kind of editor
 * is being used and what content formats it supports
 */

import type { PlatformCapabilities, PlatformDetection } from './types';

/**
 * Registry of known platform capabilities
 */
export const PLATFORM_REGISTRY: Record<string, PlatformCapabilities> = {
  'linkedin-quill': {
    id: 'linkedin-quill',
    name: 'LinkedIn (Quill Editor)',
    supportedBlocks: ['paragraph', 'heading', 'list'],
    supportedFormatting: ['bold', 'italic'],
    maxNestingLevel: 2,
    hasLinkSupport: true,
    hasCodeSyntaxHighlighting: false,
    preferredFormat: 'delta'
  },
  'linkedin-article': {
    id: 'linkedin-article',
    name: 'LinkedIn Article Editor',
    supportedBlocks: ['paragraph', 'heading', 'list', 'quote', 'code', 'divider'],
    supportedFormatting: ['bold', 'italic', 'underline', 'code'],
    maxNestingLevel: 3,
    hasLinkSupport: true,
    hasCodeSyntaxHighlighting: true,
    preferredFormat: 'html'
  },
  'gmail': {
    id: 'gmail',
    name: 'Gmail Compose',
    supportedBlocks: ['paragraph', 'list'],
    supportedFormatting: ['bold', 'italic', 'underline'],
    maxNestingLevel: 2,
    hasLinkSupport: true,
    hasCodeSyntaxHighlighting: false,
    preferredFormat: 'html'
  },
  'discord': {
    id: 'discord',
    name: 'Discord Message',
    supportedBlocks: ['paragraph', 'code'],
    supportedFormatting: ['bold', 'italic', 'strikethrough', 'code'],
    maxNestingLevel: 1,
    hasLinkSupport: true,
    hasCodeSyntaxHighlighting: true,
    preferredFormat: 'markdown'
  },
  'slack': {
    id: 'slack',
    name: 'Slack Message',
    supportedBlocks: ['paragraph', 'list', 'quote', 'code'],
    supportedFormatting: ['bold', 'italic', 'strikethrough', 'code'],
    maxNestingLevel: 2,
    hasLinkSupport: true,
    hasCodeSyntaxHighlighting: true,
    preferredFormat: 'markdown'
  },
  'github': {
    id: 'github',
    name: 'GitHub (Markdown)',
    supportedBlocks: ['paragraph', 'heading', 'list', 'quote', 'code', 'divider'],
    supportedFormatting: ['bold', 'italic', 'strikethrough', 'code'],
    maxNestingLevel: 5,
    hasLinkSupport: true,
    hasCodeSyntaxHighlighting: true,
    preferredFormat: 'markdown'
  },
  'notion': {
    id: 'notion',
    name: 'Notion',
    supportedBlocks: ['paragraph', 'heading', 'list', 'quote', 'code', 'divider'],
    supportedFormatting: ['bold', 'italic', 'underline', 'strikethrough', 'code'],
    maxNestingLevel: 10,
    hasLinkSupport: true,
    hasCodeSyntaxHighlighting: true,
    preferredFormat: 'html'
  },
  'contenteditable-generic': {
    id: 'contenteditable-generic',
    name: 'Generic ContentEditable',
    supportedBlocks: ['paragraph', 'heading', 'list'],
    supportedFormatting: ['bold', 'italic', 'underline'],
    maxNestingLevel: 3,
    hasLinkSupport: true,
    hasCodeSyntaxHighlighting: false,
    preferredFormat: 'html'
  },
  'textarea': {
    id: 'textarea',
    name: 'Plain Text Area',
    supportedBlocks: ['paragraph'],
    supportedFormatting: [],
    maxNestingLevel: 1,
    hasLinkSupport: false,
    hasCodeSyntaxHighlighting: false,
    preferredFormat: 'plaintext'
  }
};

/**
 * Platform detection patterns
 */
interface PlatformPattern {
  domain: string[];
  selectors: string[];
  confidence: number;
  platformId: string;
  editorType: PlatformDetection['editorType'];
  additionalChecks?: () => boolean;
}

const PLATFORM_PATTERNS: PlatformPattern[] = [
  {
    domain: ['linkedin.com'],
    selectors: ['.ql-editor', '[contenteditable="true"].ql-editor'],
    confidence: 0.95,
    platformId: 'linkedin-quill',
    editorType: 'quill'
  },
  {
    domain: ['linkedin.com'],
    selectors: ['[data-editor="true"]', '.editor-content'],
    confidence: 0.9,
    platformId: 'linkedin-article',
    editorType: 'contenteditable'
  },
  {
    domain: ['mail.google.com', 'gmail.com'],
    selectors: ['[contenteditable="true"][role="textbox"]', '.Am.Al.editable'],
    confidence: 0.95,
    platformId: 'gmail',
    editorType: 'contenteditable'
  },
  {
    domain: ['discord.com'],
    selectors: ['[data-slate-editor="true"]', '.slateTextArea-1Mkdgw'],
    confidence: 0.9,
    platformId: 'discord',
    editorType: 'contenteditable'
  },
  {
    domain: ['slack.com'],
    selectors: ['[data-qa="message_input"]', '.ql-editor[contenteditable="true"]'],
    confidence: 0.9,
    platformId: 'slack',
    editorType: 'contenteditable'
  },
  {
    domain: ['github.com'],
    selectors: ['textarea[name="comment[body]"]', 'textarea[data-testid="comment-body"]'],
    confidence: 0.9,
    platformId: 'github',
    editorType: 'textarea'
  },
  {
    domain: ['notion.so', 'notion.com'],
    selectors: ['[contenteditable="true"][data-content-editable-leaf="true"]'],
    confidence: 0.95,
    platformId: 'notion',
    editorType: 'contenteditable'
  }
];

/**
 * Detects the current platform and editor type
 */
export function detectPlatform(): PlatformDetection {
  const domain = window.location.hostname.toLowerCase();
  const activeElement = document.activeElement;
  
  console.log('[Platform Detection] Analyzing:', domain, 'Active element:', activeElement);

  // Try pattern matching first
  for (const pattern of PLATFORM_PATTERNS) {
    if (pattern.domain.some(d => domain.includes(d))) {
      console.log('[Platform Detection] Checking pattern for:', pattern.platformId);
      
      // Check if any of the selectors exist
      const foundElements = pattern.selectors
        .map(selector => document.querySelector(selector))
        .filter(Boolean);

      if (foundElements.length > 0) {
        console.log('[Platform Detection] Found elements:', foundElements);
        
        // Run additional checks if specified
        if (pattern.additionalChecks && !pattern.additionalChecks()) {
          continue;
        }

        return {
          domain,
          platformId: pattern.platformId,
          confidence: pattern.confidence,
          editorType: pattern.editorType,
          detectedElements: pattern.selectors.filter(selector => document.querySelector(selector))
        };
      }
    }
  }

  // Fallback detection based on active element
  if (activeElement) {
    console.log('[Platform Detection] Fallback detection on active element');
    
    if (activeElement.tagName.toLowerCase() === 'textarea') {
      return {
        domain,
        platformId: 'textarea',
        confidence: 0.7,
        editorType: 'textarea',
        detectedElements: ['textarea:focus']
      };
    }

    if (activeElement.getAttribute('contenteditable') === 'true') {
      // Check for Quill editor indicators
      if (activeElement.classList.contains('ql-editor') || 
          activeElement.closest('.ql-container')) {
        return {
          domain,
          platformId: 'contenteditable-generic',
          confidence: 0.6,
          editorType: 'quill',
          detectedElements: ['[contenteditable="true"].ql-editor']
        };
      }

      return {
        domain,
        platformId: 'contenteditable-generic',
        confidence: 0.6,
        editorType: 'contenteditable',
        detectedElements: ['[contenteditable="true"]:focus']
      };
    }
  }

  // Generic fallback
  const hasContentEditable = document.querySelector('[contenteditable="true"]');
  const hasTextarea = document.querySelector('textarea');
  
  if (hasContentEditable) {
    return {
      domain,
      platformId: 'contenteditable-generic',
      confidence: 0.3,
      editorType: 'contenteditable',
      detectedElements: ['[contenteditable="true"]']
    };
  }

  if (hasTextarea) {
    return {
      domain,
      platformId: 'textarea',
      confidence: 0.3,
      editorType: 'textarea',
      detectedElements: ['textarea']
    };
  }

  // Unknown platform
  return {
    domain,
    platformId: 'unknown',
    confidence: 0,
    editorType: 'unknown',
    detectedElements: []
  };
}

/**
 * Gets platform capabilities for a given platform ID
 */
export function getPlatformCapabilities(platformId: string): PlatformCapabilities {
  return PLATFORM_REGISTRY[platformId] || PLATFORM_REGISTRY['textarea'];
}

/**
 * Determines the best content format for the current platform
 */
export function getBestFormatForPlatform(platformId: string): 'html' | 'markdown' | 'delta' | 'plaintext' {
  const capabilities = getPlatformCapabilities(platformId);
  return capabilities.preferredFormat;
}

/**
 * Checks if a platform supports a specific content block type
 */
export function platformSupportsBlock(platformId: string, blockType: string): boolean {
  const capabilities = getPlatformCapabilities(platformId);
  return capabilities.supportedBlocks.includes(blockType as any);
}

/**
 * Checks if a platform supports specific text formatting
 */
export function platformSupportsFormatting(platformId: string, formatting: string): boolean {
  const capabilities = getPlatformCapabilities(platformId);
  return capabilities.supportedFormatting.includes(formatting as any);
}

/**
 * Gets the maximum nesting level supported by a platform
 */
export function getPlatformMaxNesting(platformId: string): number {
  const capabilities = getPlatformCapabilities(platformId);
  return capabilities.maxNestingLevel || 1;
}

/**
 * Enhanced platform detection that includes editor analysis
 */
export function detectPlatformWithEditor(): PlatformDetection & { 
  editorElement?: Element;
  isQuillEditor?: boolean;
  isTinyMCE?: boolean;
  isSlate?: boolean;
} {
  const baseDetection = detectPlatform();
  const activeElement = document.activeElement;
  
  let editorElement: Element | undefined;
  let isQuillEditor = false;
  let isTinyMCE = false;
  let isSlate = false;

  if (activeElement) {
    editorElement = activeElement;

    // Check for Quill editor
    if (activeElement.classList.contains('ql-editor') || 
        activeElement.closest('.ql-container') ||
        document.querySelector('.ql-toolbar')) {
      isQuillEditor = true;
    }

    // Check for TinyMCE
    if (activeElement.id?.includes('tinymce') ||
        document.querySelector('.tox-tinymce') ||
        (window as any).tinymce) {
      isTinyMCE = true;
    }

    // Check for Slate editor
    if (activeElement.hasAttribute('data-slate-editor') ||
        activeElement.closest('[data-slate-editor]')) {
      isSlate = true;
    }
  }

  return {
    ...baseDetection,
    editorElement,
    isQuillEditor,
    isTinyMCE,
    isSlate
  };
}

/**
 * Gets the focused editable element
 */
export function getFocusedEditableElement(): Element | null {
  const activeElement = document.activeElement;
  
  if (!activeElement) return null;
  
  // Check if it's directly editable
  if (activeElement.tagName.toLowerCase() === 'textarea' ||
      activeElement.getAttribute('contenteditable') === 'true') {
    return activeElement;
  }

  // Check if it's inside an editable element
  const editableParent = activeElement.closest('[contenteditable="true"]');
  if (editableParent) {
    return editableParent;
  }

  return null;
}

/**
 * Waits for an editable element to be available
 */
export function waitForEditableElement(timeout: number = 5000): Promise<Element | null> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkForElement = () => {
      const element = getFocusedEditableElement();
      
      if (element) {
        resolve(element);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        resolve(null);
        return;
      }
      
      setTimeout(checkForElement, 100);
    };
    
    checkForElement();
  });
}