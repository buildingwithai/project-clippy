/**
 * URL utilities for Project Clippy.
 * Handles URL capture, domain extraction, and validation.
 */

/**
 * Gets the current active tab's URL.
 * Used by background script to capture source URLs.
 */
export const getCurrentUrl = async (): Promise<string | null> => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.url || null;
  } catch (error) {
    console.error('Error getting current URL:', error);
    return null;
  }
};

/**
 * Extracts the domain from a URL.
 * Returns the hostname (e.g., "github.com" from "https://github.com/user/repo").
 */
export const extractDomain = (url: string): string | null => {
  try {
    const urlObject = new URL(url);
    return urlObject.hostname;
  } catch (error) {
    console.error('Error extracting domain from URL:', url, error);
    return null;
  }
};

/**
 * Validates if a string is a valid URL.
 * Returns true if valid, false otherwise.
 */
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Gets favicon URL for a given domain.
 * Uses Google's favicon service with fallback to generic globe icon.
 */
export const getFaviconUrl = (domain: string): string => {
  // Temporarily returning emoji to stop console spam while debugging domain filtering
  return '🌐'; // Fallback emoji
  
  // if (!domain) {
  //   return '🌐'; // Fallback emoji
  // }
  
  // Use Google's favicon service with high resolution (128px source for crisp scaling)
  // return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
};

/**
 * Normalizes a URL by removing unnecessary parts for display.
 * Removes protocol, www, and trailing slashes.
 */
export const normalizeUrlForDisplay = (url: string): string => {
  try {
    const urlObject = new URL(url);
    let display = urlObject.hostname;
    
    // Remove www. prefix
    if (display.startsWith('www.')) {
      display = display.substring(4);
    }
    
    return display;
  } catch (error) {
    console.error('Error normalizing URL for display:', url, error);
    return url;
  }
};

/**
 * Captures URL and domain data for a snippet.
 * Used during save operations to auto-populate source information.
 */
export const captureUrlData = async (): Promise<{ sourceUrl: string | null; sourceDomain: string | null }> => {
  const sourceUrl = await getCurrentUrl();
  const sourceDomain = sourceUrl ? extractDomain(sourceUrl) : null;
  
  return {
    sourceUrl,
    sourceDomain,
  };
};
