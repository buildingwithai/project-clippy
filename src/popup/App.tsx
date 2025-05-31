import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Snippet } from '@/utils/types';
import { cn } from '@/lib/utils';

function App() {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState("manage");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const loadSnippets = useCallback(() => {
    chrome.storage.local.get({ snippets: [] }, (result) => {
      setSnippets(result.snippets as Snippet[]);
    });
  }, []);

  useEffect(() => {
    loadSnippets();
    const messageListener = (message: any) => {
      if (message.action === 'snippetSaved') {
        loadSnippets();
        setActiveTab("manage");
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [loadSnippets]);

  useEffect(() => {
    chrome.storage.local.get('pendingSnippetText', (result) => {
      if (result.pendingSnippetText && typeof result.pendingSnippetText === 'string') {
        setText(result.pendingSnippetText);
        setActiveTab("add");
        chrome.storage.local.remove('pendingSnippetText');
        // Focus the title input field for a smoother UX
        setTimeout(() => titleInputRef.current?.focus(), 0); // setTimeout to ensure focus after tab switch and render
      }
    });
  }, []); // Runs once on component mount

  const resetFormAndState = () => {
    setTitle('');
    setText('');
    setEditingSnippet(null);
    setActiveTab("manage");
  };

  const handleSaveSnippet = () => {
    if (!text.trim()) {
      console.warn('Snippet text cannot be empty');
      return;
    }
    const newSnippet: Snippet = {
      id: editingSnippet ? editingSnippet.id : `snippet-${Date.now()}`,
      title: title.trim(),
      text: text.trim(),
      createdAt: editingSnippet ? editingSnippet.createdAt : new Date().toISOString(),
      lastUsed: editingSnippet?.lastUsed,
    };
    chrome.storage.local.get({ snippets: [] }, (result) => {
      let updatedSnippets: Snippet[];
      if (editingSnippet) {
        updatedSnippets = result.snippets.map((s: Snippet) => s.id === editingSnippet.id ? newSnippet : s);
      } else {
        updatedSnippets = [newSnippet, ...result.snippets];
      }
      chrome.storage.local.set({ snippets: updatedSnippets }, () => {
        setSnippets(updatedSnippets);
        resetFormAndState();
      });
    });
  };

  const handleEditSnippet = (snippet: Snippet) => {
    setEditingSnippet(snippet);
    setTitle(snippet.title || '');
    setText(snippet.text);
    setActiveTab("add");
  };

  const handleDeleteSnippet = (snippetId: string) => {
    chrome.storage.local.get({ snippets: [] }, (result) => {
      const updatedSnippets = result.snippets.filter((s: Snippet) => s.id !== snippetId);
      chrome.storage.local.set({ snippets: updatedSnippets }, () => {
        setSnippets(updatedSnippets);
        if (editingSnippet?.id === snippetId) {
          resetFormAndState();
        }
      });
    });
  };

  const handleCopyToClipboard = (snippetText: string) => {
    navigator.clipboard.writeText(snippetText).catch(err => {
      console.error('Failed to copy snippet:', err);
    });
  };

  const filteredSnippets = snippets.filter(snippet => 
    (snippet.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     snippet.text.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <TooltipProvider delayDuration={100}>
      <div className={cn(
        "p-4 h-full flex flex-col bg-gradient-to-br from-space-dark via-slate-900 to-cosmic-purple text-slate-200",
        "w-[380px] h-[550px] border border-nebula-blue/50 rounded-lg shadow-2xl shadow-star-yellow/10"
      )}>
        <header className="mb-4 text-center">
          <h1 className="text-3xl font-bold text-star-yellow tracking-wider">Project Clippy</h1>
          <p className="text-sm text-slate-400">Your Instant Snippet Library</p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-grow">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/60 border border-nebula-blue/30 mb-4">
            <TabsTrigger value="add" className="data-[state=active]:bg-nebula-blue/30 data-[state=active]:text-star-yellow">
              {editingSnippet ? 'Edit Snippet' : 'Add Snippet'}
            </TabsTrigger>
            <TabsTrigger value="manage" className="data-[state=active]:bg-nebula-blue/30 data-[state=active]:text-star-yellow">
              My Snippets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="flex-grow">
            <Card className="bg-slate-800/50 border-nebula-blue/30 shadow-lg h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-star-yellow/90 text-xl">
                  {editingSnippet ? 'Edit Snippet Details' : 'Create New Snippet'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow">
                <div>
                  <Label htmlFor="title" className="text-slate-300 mb-1 block">Title (Optional)</Label>
                  <Input 
                    ref={titleInputRef} // Added ref
                    id="title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="E.g., Email Signature" 
                    className="bg-slate-700/50 border-nebula-blue/50 text-slate-100 focus:ring-star-yellow"
                  />
                </div>
                <div>
                  <Label htmlFor="text" className="text-slate-300 mb-1 block">Snippet Text</Label>
                  <Textarea 
                    id="text" 
                    value={text} 
                    onChange={(e) => setText(e.target.value)} 
                    placeholder="Paste or type your snippet here..." 
                    rows={6} 
                    className="bg-slate-700/50 border-nebula-blue/50 text-slate-100 focus:ring-star-yellow min-h-[120px] flex-grow"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between mt-auto">
                {editingSnippet && (
                  <Button variant="outline" onClick={resetFormAndState} className="border-star-yellow/50 text-star-yellow/80 hover:bg-star-yellow/10">
                    Cancel Edit
                  </Button>
                )}
                {!editingSnippet && <div />} 
                <Button onClick={handleSaveSnippet} className="bg-star-yellow text-space-dark hover:bg-star-yellow/80 active:animate-active-glow">
                  {editingSnippet ? 'Update Snippet' : 'Save Snippet'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="flex-grow flex flex-col overflow-hidden">
            <div className="mb-4">
              <Input 
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search snippets..."
                className="bg-slate-700/50 border-nebula-blue/50 text-slate-100 focus:ring-star-yellow"
              />
            </div>
            <h2 className="text-xl font-semibold text-star-yellow/80 mb-3">
              {filteredSnippets.length} {filteredSnippets.length === 1 ? "Snippet" : "Snippets"}
            </h2>
            <ScrollArea className="flex-grow pr-2 -mr-2">
              {filteredSnippets.length > 0 ? (
                <ul className="space-y-3">
                  {filteredSnippets.map((snippet) => (
                    <li key={snippet.id}>
                      <Card className="bg-slate-800/30 border-nebula-blue/20 hover:border-nebula-blue/40 transition-colors duration-150">
                        <CardHeader className="pb-2 pt-3 px-4">
                          <CardTitle className="text-lg text-slate-100">
                            {snippet.title || <span className="italic text-slate-400">Untitled Snippet</span>}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-300 px-4 pb-3 whitespace-pre-wrap break-words">
                          {snippet.text.length > 100 ? `${snippet.text.substring(0, 100)}...` : snippet.text}
                        </CardContent>
                        <CardFooter className="px-4 pb-3 pt-2 flex justify-end space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboard(snippet.text)} className="text-sky-400 hover:text-sky-300 hover:bg-sky-400/10 p-1.5 h-auto">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-slate-200 border-nebula-blue/50"><p>Copy</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleEditSnippet(snippet)} className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 p-1.5 h-auto">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-slate-200 border-nebula-blue/50"><p>Edit</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteSnippet(snippet.id)} className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 h-auto">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-slate-200 border-nebula-blue/50"><p>Delete</p></TooltipContent>
                          </Tooltip>
                        </CardFooter>
                      </Card>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 text-center py-8">
                  {searchTerm ? "No snippets match your search." : "No snippets yet. Add one!"}
                </p>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

export default App;
