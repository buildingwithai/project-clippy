/**
 * HTML sanitization utilities for safe content processing
 * 
 * This module handles the first stage of HTML processing:
 * 1. Remove dangerous elements and attributes
 * 2. Normalize HTML structure 
 * 3. Clean browser-specific artifacts
 * 4. Prepare HTML for semantic parsing
 */

/**
 * Configuration for HTML sanitization
 */
export interface SanitizeConfig {
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  removeEmptyElements: boolean;
  normalizeWhitespace: boolean;
  maxDepth: number;
}

/**
 * Default sanitization configuration
 */
export const DEFAULT_SANITIZE_CONFIG: SanitizeConfig = {
  allowedTags: [
    // Block elements
    'p', 'div', 'br',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'hr',
    // Inline elements  
    'strong', 'b', 'em', 'i', 'u', 's', 'del',
    'a', 'span'
  ],
  allowedAttributes: {
    'a': ['href', 'title'],
    'blockquote': ['cite'],
    'code': ['class'], // For language detection
    'pre': ['class'],  // For language detection
    '*': ['style'] // Allow style for some formatting preservation
  },
  removeEmptyElements: true,
  normalizeWhitespace: true,
  maxDepth: 20
};

/**
 * Sanitizes HTML content while preserving semantic structure
 */
export function sanitizeHTML(html: string, config: Partial<SanitizeConfig> = {}): string {
  const fullConfig = { ...DEFAULT_SANITIZE_CONFIG, ...config };
  
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Create a temporary DOM to work with
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  if (!body) {
    return '';
  }

  // Sanitize the content
  sanitizeElement(body, fullConfig, 0);

  // Extract the sanitized HTML
  return body.innerHTML;
}

/**
 * Recursively sanitizes a DOM element
 */
function sanitizeElement(element: Element, config: SanitizeConfig, depth: number): void {
  if (depth > config.maxDepth) {
    element.remove();
    return;
  }

  const tagName = element.tagName.toLowerCase();

  // Remove disallowed elements
  if (!config.allowedTags.includes(tagName)) {
    // Move children up before removing the element
    const parent = element.parentNode;
    if (parent) {
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
    }
    element.remove();
    return;
  }

  // Clean attributes
  cleanAttributes(element, config);

  // Process children
  const children = Array.from(element.children);
  for (const child of children) {
    sanitizeElement(child, config, depth + 1);
  }

  // Remove empty elements if configured
  if (config.removeEmptyElements && isEmpty(element)) {
    element.remove();
    return;
  }

  // Normalize whitespace if configured
  if (config.normalizeWhitespace) {
    normalizeElementWhitespace(element);
  }
}

/**
 * Cleans element attributes according to configuration
 */
function cleanAttributes(element: Element, config: SanitizeConfig): void {
  const tagName = element.tagName.toLowerCase();
  const allowedForTag = config.allowedAttributes[tagName] || [];
  const allowedGlobal = config.allowedAttributes['*'] || [];
  const allowedAttributes = [...allowedForTag, ...allowedGlobal];

  // Get all current attributes
  const attributes = Array.from(element.attributes);

  // Remove disallowed attributes
  for (const attr of attributes) {
    const attrName = attr.name.toLowerCase();
    
    if (!allowedAttributes.includes(attrName)) {
      element.removeAttribute(attr.name);
      continue;
    }

    // Sanitize specific attribute values
    if (attrName === 'href') {
      const href = attr.value.trim();
      if (!isValidUrl(href)) {
        element.removeAttribute(attr.name);
      }
    } else if (attrName === 'style') {
      const sanitizedStyle = sanitizeStyleAttribute(attr.value);
      if (sanitizedStyle) {
        element.setAttribute('style', sanitizedStyle);
      } else {
        element.removeAttribute('style');
      }
    }
  }
}

/**
 * Checks if an element is considered empty
 */
function isEmpty(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  
  // Self-closing elements are not considered empty
  if (['br', 'hr', 'img'].includes(tagName)) {
    return false;
  }

  // Check if element has meaningful content
  const textContent = element.textContent?.trim() || '';
  const hasChildren = element.children.length > 0;
  
  return textContent === '' && !hasChildren;
}

/**
 * Normalizes whitespace in an element
 */
function normalizeElementWhitespace(element: Element): void {
  // Only normalize text nodes, preserve structure
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes: Text[] = [];
  let node: Node | null;
  
  while (node = walker.nextNode()) {
    textNodes.push(node as Text);
  }

  for (const textNode of textNodes) {
    if (textNode.textContent) {
      // Normalize whitespace but preserve intentional breaks
      const normalized = textNode.textContent
        .replace(/\s+/g, ' ') // Multiple spaces/tabs/newlines -> single space
        .replace(/^\s+|\s+$/g, ''); // Trim start/end
      
      if (normalized !== textNode.textContent) {
        textNode.textContent = normalized;
      }
    }
  }
}

/**
 * Sanitizes CSS style attribute value
 */
function sanitizeStyleAttribute(style: string): string {
  if (!style || typeof style !== 'string') {
    return '';
  }

  // Allow only safe CSS properties for basic formatting
  const allowedProperties = [
    'font-weight',
    'font-style', 
    'text-decoration',
    'color',
    'background-color'
  ];

  const declarations = style.split(';')
    .map(decl => decl.trim())
    .filter(decl => decl.length > 0);

  const sanitizedDeclarations: string[] = [];

  for (const declaration of declarations) {
    const [property, value] = declaration.split(':').map(s => s.trim());
    
    if (!property || !value) continue;
    
    const normalizedProperty = property.toLowerCase();
    
    if (allowedProperties.includes(normalizedProperty)) {
      // Basic value sanitization - remove potentially dangerous values
      const sanitizedValue = value
        .replace(/[<>'"]/g, '') // Remove dangerous characters
        .replace(/javascript:/gi, '') // Remove javascript: urls
        .replace(/expression\s*\(/gi, ''); // Remove CSS expressions
      
      if (sanitizedValue && sanitizedValue.length < 100) { // Prevent overly long values
        sanitizedDeclarations.push(`${normalizedProperty}: ${sanitizedValue}`);
      }
    }
  }

  return sanitizedDeclarations.join('; ');
}

/**
 * Validates if a string is a safe URL
 */
function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Remove dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
  const lowerUrl = url.toLowerCase().trim();
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return false;
    }
  }

  // Allow relative URLs and common safe protocols
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return true;
  }

  try {
    const urlObj = new URL(url);
    const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    return safeProtocols.includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Normalizes HTML structure for consistent parsing
 */
export function normalizeHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // First pass: basic cleanup
  let normalized = html
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove DOCTYPE declarations
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    // Remove XML declarations
    .replace(/<\?xml[^>]*\?>/gi, '')
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Parse and re-serialize to normalize structure
  const parser = new DOMParser();
  const doc = parser.parseFromString(normalized, 'text/html');
  
  if (doc.body) {
    // Clean up common formatting issues
    normalizeCommonElements(doc.body);
    
    // Extract body content
    normalized = doc.body.innerHTML;
  }

  return normalized;
}

/**
 * Normalizes common HTML elements for consistent parsing
 */
function normalizeCommonElements(container: Element): void {
  // Convert <b> to <strong>
  const boldElements = container.querySelectorAll('b');
  boldElements.forEach(b => {
    const strong = document.createElement('strong');
    strong.innerHTML = b.innerHTML;
    b.parentNode?.replaceChild(strong, b);
  });

  // Convert <i> to <em>
  const italicElements = container.querySelectorAll('i');
  italicElements.forEach(i => {
    const em = document.createElement('em');
    em.innerHTML = i.innerHTML;
    i.parentNode?.replaceChild(em, i);
  });

  // Normalize divs that should be paragraphs
  const divElements = container.querySelectorAll('div');
  divElements.forEach(div => {
    // If div only contains inline content and no block elements, convert to p
    const hasBlockChildren = Array.from(div.children).some(child => {
      const tagName = child.tagName.toLowerCase();
      return ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'pre'].includes(tagName);
    });

    if (!hasBlockChildren && div.textContent?.trim()) {
      const p = document.createElement('p');
      p.innerHTML = div.innerHTML;
      div.parentNode?.replaceChild(p, div);
    }
  });

  // Remove empty paragraphs and divs
  const emptyElements = container.querySelectorAll('p:empty, div:empty');
  emptyElements.forEach(element => {
    element.remove();
  });
}

/**
 * Comprehensive HTML cleaning pipeline
 */
export function cleanHTML(html: string, config?: Partial<SanitizeConfig>): string {
  // Step 1: Normalize structure
  const normalized = normalizeHTML(html);
  
  // Step 2: Sanitize content
  const sanitized = sanitizeHTML(normalized, config);
  
  return sanitized;
}