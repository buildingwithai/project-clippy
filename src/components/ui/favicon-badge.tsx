/**
 * Favicon badge component for displaying source URLs.
 * Shows website favicon with domain tooltip, clicks to open full URL.
 * Enhanced with loading states and smooth fallback handling.
 */
import React, { useState } from 'react';
import { CustomTooltip } from '@/components/ui/custom-tooltip';
import { getFaviconUrl, normalizeUrlForDisplay } from '../../utils/url-helpers';
import { ExternalLink, Globe, Loader2 } from 'lucide-react';

interface FaviconBadgeProps {
  sourceUrl?: string;
  sourceDomain?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const FaviconBadge: React.FC<FaviconBadgeProps> = ({
  sourceUrl,
  sourceDomain,
  className = '',
  size = 'sm',
}) => {
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  if (!sourceUrl || !sourceDomain) {
    return null;
  }

  const displayDomain = normalizeUrlForDisplay(sourceUrl);
  const faviconUrl = getFaviconUrl(sourceDomain);
  // Larger favicon display for better visibility (32px for md, 24px for sm)
  const sizeClass = size === 'md' ? 'h-8 w-8' : 'h-6 w-6';
  const iconSizeClass = size === 'md' ? 'h-4 w-4' : 'h-3 w-3';
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(sourceUrl, '_blank', 'noopener,noreferrer');
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImgError(true);
  };

  // Show loading state or fallback icon
  const renderIcon = () => {
    if (imgError || faviconUrl === '🌐') {
      return <Globe className={`${sizeClass} text-slate-400`} />;
    }
    
    if (isLoading && !imageLoaded) {
      return (
        <div className="relative">
          <Loader2 className={`${iconSizeClass} animate-spin text-slate-500`} />
          <img
            src={faviconUrl}
            alt={`${displayDomain} favicon`}
            className={`${sizeClass} rounded-lg object-contain opacity-0 absolute inset-0`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      );
    }

    return (
      <img
        src={faviconUrl}
        alt={`${displayDomain} favicon`}
        className={`${sizeClass} rounded-lg object-contain transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    );
  };

  return (
    <CustomTooltip content={`Source: ${displayDomain} • Click to open`}>
      <button
        onClick={handleClick}
        className={`inline-flex items-center justify-center rounded p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all duration-200 hover:shadow-sm ${sizeClass} ${className}`}
        aria-label={`Open source URL: ${displayDomain}`}
        disabled={isLoading && !imgError}
      >
        {renderIcon()}
        <ExternalLink className={`ml-1 h-2 w-2 opacity-60 transition-opacity duration-200 ${isLoading && !imgError ? 'opacity-30' : ''}`} />
      </button>
    </CustomTooltip>
  );
};
