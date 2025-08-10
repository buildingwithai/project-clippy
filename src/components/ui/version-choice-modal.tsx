import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getCurrentVersion, getVersionCount } from '@/utils/snippet-helpers';
import type { Snippet } from '@/utils/types';

interface VersionChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  snippet: Snippet;
  onUpdateCurrent: () => void;
  onCreateNew: () => void;
}

export const VersionChoiceModal: React.FC<VersionChoiceModalProps> = ({
  isOpen,
  onClose,
  snippet,
  onUpdateCurrent,
  onCreateNew,
}) => {
  const currentVersion = getCurrentVersion(snippet);
  const versionCount = getVersionCount(snippet);
  const currentVersionNumber = (snippet.currentVersionIndex ?? 0);
  
  const handleUpdateCurrent = () => {
    onClose();
    onUpdateCurrent();
  };
  
  const handleCreateNew = () => {
    onClose();
    onCreateNew();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-sky-400 flex items-center gap-2">
            <Edit3 size={20} />
            Edit Snippet - Choose Action
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            How would you like to edit "{snippet.title || 'Untitled Snippet'}"?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Update Current Version Option */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-4 rounded-lg border border-slate-600 hover:border-sky-500/50 bg-slate-900/50 cursor-pointer transition-colors"
            onClick={handleUpdateCurrent}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <Edit3 size={18} className="text-sky-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-slate-200 font-medium mb-1">
                  Update Current Version (v{currentVersionNumber})
                </h3>
                <p className="text-slate-400 text-sm mb-3">
                  Replace the existing content in the current version
                </p>
                <div className="text-xs text-slate-500 bg-slate-800 p-2 rounded border-l-2 border-sky-500/30">
                  Current: {currentVersion.text.substring(0, 60)}
                  {currentVersion.text.length > 60 ? '...' : ''}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 border-sky-400/30 text-sky-400 hover:bg-sky-400/10"
                  onClick={handleUpdateCurrent}
                >
                  Update Version v{currentVersionNumber}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Create New Version Option */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-4 rounded-lg border border-slate-600 hover:border-green-500/50 bg-slate-900/50 cursor-pointer transition-colors"
            onClick={handleCreateNew}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <Plus size={18} className="text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-slate-200 font-medium mb-1">
                  Create New Version (v{versionCount})
                </h3>
                <p className="text-slate-400 text-sm mb-3">
                  Keep the existing version and create a new one
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="bg-slate-800 px-2 py-1 rounded border">
                    Current: {versionCount} version{versionCount === 1 ? '' : 's'}
                  </span>
                  <span>→</span>
                  <span className="bg-green-900/30 border border-green-500/30 px-2 py-1 rounded">
                    New: {versionCount + 1} versions
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 border-green-400/30 text-green-400 hover:bg-green-400/10"
                  onClick={handleCreateNew}
                >
                  Create New Version
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};