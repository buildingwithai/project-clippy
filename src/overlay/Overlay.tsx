import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Snippet, Folder } from '@/utils/types';

const Overlay: React.FC = () => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    chrome.storage.local.get(['snippets', 'folders'], (result) => {
      setSnippets((result.snippets as Snippet[]) || []);
      setFolders((result.folders as Folder[]) || []);
    });
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
    <div ref={overlayRef} onClick={(e) => e.target === overlayRef.current && requestClose()} className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-20 z-50">
      <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-xl mx-4">
        {activeFolder && (
          <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
            <button onClick={() => { setActiveFolder(null); setQuery(''); }} className="hover:bg-gray-200 p-1 rounded">←</button>
            <span>Folder: {activeFolder.emoji} {activeFolder.name}</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={activeFolder ? 'Search in folder...' : 'Search snippets, or use `/` for folders, `#` for tags...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <ul className="mt-2 h-72 overflow-y-auto">
          {filteredResults.length > 0 ? (
            filteredResults.map((item, index) => (
              <li
                key={item.id}
                onMouseDown={() => handleItemSelect(item)}
                className={`p-3 rounded-md cursor-pointer flex items-center gap-3 ${
                  index === selectedIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
              >
                {'text' in item ? (
                  <div className="flex-grow truncate">
                    <div className="font-bold text-gray-800 truncate">{item.title || item.text.substring(0, 60)}</div>
                    <div className="text-sm text-gray-600 truncate">{item.text}</div>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {item.tags.map(tag => (
                          <span key={tag} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="font-bold text-gray-800">{item.emoji} {item.name}</div>
                )}
              </li>
            ))
          ) : (
            <p className="text-gray-500 text-center pt-8">No results found.</p>
          )}
        </ul>
        <div className="mt-2 text-right text-xs text-gray-500">
          Use <kbd className="mx-1 px-1.5 py-1 font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">↑</kbd>
          <kbd className="mx-1 px-1.5 py-1 font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">↓</kbd> to navigate, 
          <kbd className="mx-1 px-1.5 py-1 font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Enter</kbd> to select, and
          <kbd className="mx-1 px-1.5 py-1 font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Esc</kbd> to go back/close.
        </div>
      </div>
    </div>
  );
};


export default Overlay;
