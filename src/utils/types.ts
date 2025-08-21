/**
 * Type definitions for Project Clippy.
 */

export interface SnippetVersion {
  id: string;      // Unique identifier for this version
  title?: string;  // Optional title for this version
  text: string;    // The snippet content (plain text)
  html?: string;   // Optional: HTML content for rich formatting
  createdAt: string; // ISO date string for when this version was created
  clippyContent?: ClippyContent; // NEW: Semantic content model for universal compatibility
}

export interface Snippet {
  id: string;
  title?: string; // Optional title
  text: string;    // DEPRECATED: The snippet content - use getCurrentVersion() instead
  html?: string;   // DEPRECATED: HTML content - use getCurrentVersion() instead  
  createdAt: string; // ISO date string for when it was created
  folderId?: string; // Optional: ID of the folder this snippet belongs to
  tags?: string[];   // Optional tags for better organization
  lastUsed?: string; // Optional: ISO date string for when it was last used
  frequency?: number; // Optional: How many times it has been used
  isPinned?: boolean; // Optional: True if the snippet is pinned
  pinnedAt?: string;  // Optional: ISO date string for when it was pinned
  sortOrder?: number; // Optional: Custom sort order for drag and drop reordering
  versions: SnippetVersion[]; // Array of ALL versions (including current) - required
  currentVersionIndex: number; // Index of the currently active version (default: 0)
  sourceUrl?: string; // Optional: Full URL where this snippet was captured from
  sourceDomain?: string; // Optional: Domain extracted from sourceUrl (e.g., "github.com")
  clippyContent?: ClippyContent; // NEW: Semantic content model for universal compatibility
}

export interface Folder {
  id: string;
  name: string;
  emoji: string; // Emoji representing the folder
  createdAt: string; // ISO date string
}

// =============================================
// ClippyContent: Semantic Content Model
// =============================================

/**
 * Main interface for semantic content representation
 * This replaces HTML as the primary content format for 1:1 copy-paste
 */
export interface ClippyContent {
  version: "1.0";
  blocks: ContentBlock[];
  metadata?: {
    sourceUrl?: string;
    sourceDomain?: string;
    capturedAt: string;
    originalFormat?: 'html' | 'markdown' | 'text';
  };
}

/**
 * Union type for all supported content blocks
 */
export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | QuoteBlock
  | CodeBlock
  | DividerBlock;

/**
 * Base interface for all content blocks
 */
interface BaseBlock {
  id: string; // Unique identifier for this block
}

/**
 * Paragraph block - contains inline content
 */
export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  content: InlineContent[];
}

/**
 * Heading block - contains inline content with level
 */
export interface HeadingBlock extends BaseBlock {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  content: InlineContent[];
}

/**
 * List block - supports nested lists
 */
export interface ListBlock extends BaseBlock {
  type: "list";
  listType: "bulleted" | "numbered";
  items: ListItem[];
}

/**
 * List item - can contain nested content and lists
 */
export interface ListItem {
  id: string;
  content: InlineContent[];
  nested?: ListBlock; // Support for nested lists
}

/**
 * Quote block - for blockquotes
 */
export interface QuoteBlock extends BaseBlock {
  type: "quote";
  content: InlineContent[];
  citation?: string; // Optional citation
}

/**
 * Code block - for code snippets
 */
export interface CodeBlock extends BaseBlock {
  type: "code";
  language?: string; // Programming language for syntax highlighting
  content: string; // Raw code content (no inline formatting)
}

/**
 * Divider block - horizontal rule
 */
export interface DividerBlock extends BaseBlock {
  type: "divider";
  // No additional content needed
}

/**
 * Union type for inline content
 */
export type InlineContent = TextSpan | LinkSpan | LineBreak;

/**
 * Text span with optional formatting
 */
export interface TextSpan {
  type: "text";
  text: string;
  formatting?: TextFormatting;
}

/**
 * Link span - for hyperlinks
 */
export interface LinkSpan {
  type: "link";
  url: string;
  text: string;
  formatting?: TextFormatting;
}

/**
 * Line break - for soft line breaks within blocks
 */
export interface LineBreak {
  type: "linebreak";
}

/**
 * Text formatting options
 */
export interface TextFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean; // Inline code formatting
}

/**
 * Platform capabilities - describes what each platform supports
 */
export interface PlatformCapabilities {
  id: string;
  name: string;
  supportedBlocks: ContentBlock['type'][];
  supportedFormatting: (keyof TextFormatting)[];
  maxNestingLevel?: number; // For lists
  hasLinkSupport: boolean;
  hasCodeSyntaxHighlighting: boolean;
  preferredFormat: 'html' | 'markdown' | 'delta' | 'plaintext';
}

/**
 * Platform detection result
 */
export interface PlatformDetection {
  domain: string;
  platformId: string;
  confidence: number; // 0-1, how confident we are in the detection
  editorType?: 'quill' | 'contenteditable' | 'textarea' | 'markdown' | 'unknown';
  detectedElements?: string[]; // CSS selectors that helped identify the platform
}
