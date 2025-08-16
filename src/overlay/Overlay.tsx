import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Snippet, Folder } from '@/utils/types';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Zap, Sparkles, Bolt, Star } from 'lucide-react';

const Overlay: React.FC = () => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [host, setHost] = useState<string | null>(null);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Visual skin state (does not affect logic)
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [dims, setDims] = useState({ w: 640, h: 520 });
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-(dims.h / 2), dims.h / 2], [15, -15]);
  const rotateY = useTransform(mouseX, [-(dims.w / 2), dims.w / 2], [-15, 15]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateDims = () => {
      const rect = el.getBoundingClientRect();
      setDims({ w: rect.width, h: rect.height });
    };
    updateDims();
    const resizeObserver = new ResizeObserver(updateDims);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      setMousePosition({ x, y });
      mouseX.set(x);
      mouseY.set(y);
    };
    el.addEventListener('mousemove', handleMouseMove);
    return () => el.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const particles = useMemo(() => (
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * dims.w,
      y: Math.random() * dims.h,
      delay: Math.random() * 2,
    }))
  ), [dims.w, dims.h]);

  useEffect(() => {
    chrome.storage.local.get(['snippets', 'folders'], (result) => {
      setSnippets((result.snippets as Snippet[]) || []);
      setFolders((result.folders as Folder[]) || []);
    });
  }, []);

  // Read host passed via hash (e.g., #host=example.com)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const h = params.get('host');
      if (h) setHost(h);
    } catch {
      // ignore
    }
  }, []);

  const isSearchingFolders = query.startsWith('/');
  const isSearchingTags = query.startsWith('#');

  const filteredResults = useMemo(() => {
    const lowerCaseQuery = query.toLowerCase().trim();

    if (activeFolder) {
      return snippets.filter(s => s.folderId === activeFolder.id && s.text.toLowerCase().includes(lowerCaseQuery));
    }

    if (isSearchingFolders) {
      const folderQuery = lowerCaseQuery.substring(1);
      return folders.filter(f => f.name.toLowerCase().includes(folderQuery));
    }

    if (isSearchingTags) {
      const tagQuery = lowerCaseQuery.substring(1);
      return snippets.filter(s => s.tags?.some(tag => tag.toLowerCase().includes(tagQuery)));
    }

    return snippets.filter(s => {
      const folder = folders.find(f => f.id === s.folderId);
      const tagMatch = s.tags?.some(tag => tag.toLowerCase().includes(lowerCaseQuery));
      return s.title?.toLowerCase().includes(lowerCaseQuery) ||
             s.text.toLowerCase().includes(lowerCaseQuery) ||
             folder?.name.toLowerCase().includes(lowerCaseQuery) ||
             tagMatch;
    });
  }, [query, snippets, folders, activeFolder, isSearchingFolders, isSearchingTags]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeFolder]);

  const requestClose = () => window.parent.postMessage({ type: 'CLOSE_CLIPPY_OVERLAY' }, '*');

  const handleItemSelect = (item: Snippet | Folder) => {
    if ('text' in item) {
      chrome.runtime.sendMessage({ type: 'PASTE_SNIPPET', snippet: item });
      requestClose();
    } else {
      setActiveFolder(item);
      setQuery('');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeFolder) {
          setActiveFolder(null);
          setQuery('');
        } else {
          requestClose();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filteredResults.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (filteredResults.length || 1)) % (filteredResults.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedItem = filteredResults[selectedIndex];
        if (selectedItem) handleItemSelect(selectedItem);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredResults, selectedIndex, activeFolder]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div ref={overlayRef} onClick={(e) => e.target === overlayRef.current && requestClose()} style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'transparent',
      backgroundColor: 'transparent',
      zIndex: 50,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingTop: '80px'
    }}>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl w-full max-w-xl mx-4"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background gradient */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: isHovered
              ? 'linear-gradient(135deg, #1a1a1a 0%, #000000 50%, #2a2a2a 100%)'
              : 'linear-gradient(135deg, #0f0f0f 0%, #000000 50%, #1a1a1a 100%)',
          }}
          transition={{ duration: 0.5 }}
        />

        {/* Animated border */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background:
              'linear-gradient(45deg, transparent, rgba(255,255,255,0.08), transparent)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />

        {/* Main 3D container */}
        <motion.div
          className="absolute inset-1 rounded-xl border border-white/10 shadow-2xl"
          style={{
            transformStyle: 'preserve-3d',
            rotateX,
            rotateY,
            background: '#0a0a0a',
          }}
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Inner glow */}
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{
              background:
                'radial-gradient(circle at center, rgba(255,255,255,0.06) 0%, transparent 70%)',
            }}
            animate={{ opacity: isHovered ? 0.8 : 0.35 }}
            transition={{ duration: 0.3 }}
          />

          {/* Central energy core */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-14 h-14 -translate-x-1/2 -translate-y-1/2"
            animate={{ scale: [1, 1.15, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="relative w-full h-full">
              <motion.div
                className="absolute inset-0 bg-white rounded-full opacity-20"
                animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.45, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute inset-2 bg-gray-300 rounded-full opacity-40"
                animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.6, 0.35] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
              />
              <motion.div
                className="absolute inset-4 bg-white rounded-full"
                animate={{ scale: [1, 1.08, 1], opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
              />
            </div>
          </motion.div>

          {/* Energy rings */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 border border-white/70 rounded-full opacity-20"
              style={{
                width: 72 + i * 36,
                height: 72 + i * 36,
                marginLeft: -(36 + i * 18),
                marginTop: -(36 + i * 18),
              }}
              animate={{ rotate: [0, 360], scale: [1, 1.08, 1], opacity: [0.1, 0.28, 0.1] }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: 'linear', delay: i * 0.45 }}
            />
          ))}

          {/* Corner energy indicators */}
          {[
            { icon: Zap, position: 'top-4 left-4' },
            { icon: Sparkles, position: 'top-4 right-4' },
            { icon: Bolt, position: 'bottom-4 left-4' },
            { icon: Star, position: 'bottom-4 right-4' },
          ].map(({ icon: Icon, position }, i) => (
            <motion.div
              key={i}
              className={`absolute ${position} text-white opacity-70`}
              animate={{ scale: [1, 1.22, 1], opacity: [0.45, 0.85, 0.45], rotate: [0, 180, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.28 }}
            >
              <Icon size={18} />
            </motion.div>
          ))}

          {/* Particle system */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute w-1 h-1 bg-white rounded-full"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                x: [0, Math.random() * 100 - 50],
                y: [0, Math.random() * 100 - 50],
              }}
              transition={{ duration: 2, delay: p.delay, repeat: Infinity, repeatDelay: Math.random() * 3 }}
              style={{ left: p.x, top: p.y }}
            />
          ))}

          {/* Energy waves tied to pointer */}
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${mousePosition.x + dims.w / 2}px ${mousePosition.y +
                dims.h / 2}px, rgba(255,255,255,0.08) 0%, transparent 55%)`,
            }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Actual modal content (logic intact) */}
          <div className="relative z-10 p-4">
            {/* Header: domain chip and close */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {host && (
                  <span aria-label="Current domain" className="text-xs bg-white/10 text-white px-2 py-1 rounded-full">
                    {host}
                  </span>
                )}
                {activeFolder && (
                  <span className="text-xs bg-white/10 text-white/90 px-2 py-1 rounded-full">
                    {activeFolder.emoji} {activeFolder.name}
                  </span>
                )}
              </div>
              <button aria-label="Close" onClick={requestClose} className="text-white/70 hover:text-white">✕</button>
            </div>

            {activeFolder && (
              <div className="flex items-center gap-2 mb-2 text-sm text-white/80">
                <button
                  onClick={() => {
                    setActiveFolder(null);
                    setQuery('');
                  }}
                  className="hover:bg-white/10 p-1 rounded"
                >
                  ←
                </button>
                <span>
                  Folder: {activeFolder.emoji} {activeFolder.name}
                </span>
              </div>
            )}

            <input
              ref={inputRef}
              type="text"
              placeholder={activeFolder ? 'Search in folder...' : 'Search snippets, or use `/` for folders, `#` for tags...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-3 border border-white/15 rounded-md bg-black/60 text-white placeholder-white/40 focus:ring-2 focus:ring-white/30 outline-none"
            />

            <ul className="mt-2 h-72 overflow-y-auto">
              {filteredResults.length > 0 ? (
                filteredResults.map((item, index) => (
                  <li
                    key={item.id}
                    onMouseDown={() => handleItemSelect(item)}
                    className={`p-3 rounded-md cursor-pointer flex items-center gap-3 transition-colors ${
                      index === selectedIndex ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/90'
                    }`}
                  >
                    {'text' in item ? (
                      <div className="flex-grow truncate">
                        <div className="font-bold truncate text-white">{item.title || item.text.substring(0, 60)}</div>
                        <div className="text-sm text-white/70 truncate">{item.text}</div>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {item.tags.map((tag) => (
                              <span key={tag} className="text-xs bg-white/10 text-white/80 px-2 py-0.5 rounded-full">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="font-bold text-white">{item.emoji} {item.name}</div>
                    )}
                  </li>
                ))
              ) : (
                <p className="text-white/60 text-center pt-8">No results found.</p>
              )}
            </ul>

            <div className="mt-2 text-right text-xs text-white/60">
              Use
              <kbd className="mx-1 px-1.5 py-1 font-semibold text-white bg-white/10 border border-white/20 rounded">↑</kbd>
              <kbd className="mx-1 px-1.5 py-1 font-semibold text-white bg-white/10 border border-white/20 rounded">↓</kbd>
              to navigate,
              <kbd className="mx-1 px-1.5 py-1 font-semibold text-white bg-white/10 border border-white/20 rounded">Enter</kbd>
              to select, and
              <kbd className="mx-1 px-1.5 py-1 font-semibold text-white bg-white/10 border border-white/20 rounded">Esc</kbd>
              to go back/close.
            </div>
          </div>
        </motion.div>

        {/* Outer glow */}
        <motion.div
          className="absolute -inset-2 rounded-3xl opacity-50 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
            filter: 'blur(10px)',
          }}
          animate={{ scale: isHovered ? 1.03 : 1, opacity: isHovered ? 0.7 : 0.35 }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
};


export default Overlay;
