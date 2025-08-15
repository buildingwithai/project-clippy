import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAllVersions, getCurrentVersion } from '@/utils/snippet-helpers';
import type { Snippet, SnippetVersion } from '@/utils/types';

interface VersionCarouselProps {
  snippet: Snippet;
  className?: string;
  onVersionChange?: (snippetId: string, versionIndex: number) => void;
  currentViewingIndex?: number; // Override for which version to show
}

export const VersionCarousel: React.FC<VersionCarouselProps> = ({
  snippet,
  className,
  onVersionChange,
  currentViewingIndex,
}) => {
  const [viewingVersionIndex, setViewingVersionIndex] = useState(
    currentViewingIndex ?? snippet.currentVersionIndex ?? 0
  );
  const [error, setError] = useState<string | null>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  
  // Get all versions using helper function
  const allVersions = React.useMemo(() => {
    return getAllVersions(snippet);
  }, [snippet]);
  
  const totalVersions = allVersions.length;
  
  // Reset to current version when snippet changes or viewing index updates
  useEffect(() => {
    setViewingVersionIndex(currentViewingIndex ?? snippet.currentVersionIndex ?? 0);
    setError(null);
  }, [snippet.id, snippet.currentVersionIndex, currentViewingIndex]);
  
  // Handle version navigation
  const goToPreviousVersion = () => {
    if (viewingVersionIndex > 0) {
      const newIndex = viewingVersionIndex - 1;
      setViewingVersionIndex(newIndex);
      setError(null);
      onVersionChange?.(snippet.id, newIndex);
    }
  };
  
  const goToNextVersion = () => {
    if (viewingVersionIndex < totalVersions - 1) {
      const newIndex = viewingVersionIndex + 1;
      setViewingVersionIndex(newIndex);
      setError(null);
      onVersionChange?.(snippet.id, newIndex);
    }
  };
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!footerRef.current || !footerRef.current.contains(document.activeElement)) {
        return;
      }
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPreviousVersion();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNextVersion();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewingVersionIndex, totalVersions]);
  
  // Get current version data
  const currentVersion = allVersions[viewingVersionIndex];
  const canGoPrevious = viewingVersionIndex > 0;
  const canGoNext = viewingVersionIndex < totalVersions - 1;
  
  // Error handling for missing versions
  React.useEffect(() => {
    if (!currentVersion) {
      setError('Version not found');
      // Try to show a valid version
      const validIndex = allVersions.findIndex(v => v);
      if (validIndex !== -1 && validIndex !== viewingVersionIndex) {
        setViewingVersionIndex(validIndex);
      }
    }
  }, [currentVersion, allVersions, viewingVersionIndex]);
  
  // Always render - even for single versions (this is the key change!)
  
  return (
    <div className={cn("w-full", className)}>
      {/* Divider */}
      <div className="w-full h-px bg-white/8 mb-2" />
      
      {/* Content with slide animation - compact preview */}
      <div className="relative overflow-hidden mb-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={viewingVersionIndex}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ 
              duration: 0.28, 
              ease: [0.25, 0.1, 0.25, 1] // ease-out
            }}
            className="text-slate-300 bg-slate-900/50 p-2.5 rounded-md max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800"
            style={{fontSize: '10px'}}
          >
            {error ? (
              <div className="text-red-400 text-xs">
                {error}
              </div>
            ) : currentVersion ? (
              currentVersion.html ? (
                <div 
                  className="whitespace-pre-wrap break-all snippet-html-content"
                  dangerouslySetInnerHTML={{ 
                    __html: (() => {
                      const textContent = currentVersion.html.replace(/<[^>]*>/g, ''); // Strip HTML tags for length calculation
                      if (textContent.length > 100) {
                        // For HTML content, we truncate the text content and add ellipsis
                        return textContent.substring(0, 100) + '...';
                      }
                      return currentVersion.html;
                    })()
                  }} 
                />
              ) : (
                <pre className="whitespace-pre-wrap break-all">
                  {currentVersion.text.length > 100 
                    ? currentVersion.text.substring(0, 100) + '...'
                    : currentVersion.text
                  }
                </pre>
              )
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Footer with version controls - ultra minimal */}
      <div 
        ref={footerRef}
        className="flex items-center justify-center space-x-0.5 h-5"
        tabIndex={0}
        role="group"
        aria-label="Version navigation"
      >
        <button
          className={cn(
            "w-3 h-3 flex items-center justify-center transition-opacity duration-200",
            "text-slate-500 hover:text-sky-400",
            !canGoPrevious && "opacity-30 cursor-not-allowed"
          )}
          onClick={goToPreviousVersion}
          disabled={!canGoPrevious}
          aria-label="Previous version"
        >
          <ChevronLeft size={12} />
        </button>
        
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-md font-semibold text-sky-400">
              {currentVersion?.title || snippet.title || 'Untitled Snippet'}
            </h3>
          </div>
          <span 
            className="text-[9px] font-mono text-slate-400 px-1 select-none"
            aria-live="polite"
            aria-label={`Version ${viewingVersionIndex}`}
          >
            v{viewingVersionIndex}
          </span>
        </div>
        
        <button
          className={cn(
            "w-3 h-3 flex items-center justify-center transition-opacity duration-200",
            "text-slate-500 hover:text-sky-400",
            !canGoNext && "opacity-30 cursor-not-allowed"
          )}
          onClick={goToNextVersion}
          disabled={!canGoNext}
          aria-label="Next version"
        >
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
};