import React from 'react';
import { CloudDownload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface RemotePackMeta {
  id: string;
  name: string;
  description?: string;
  snippetCount?: number;
}

interface BankViewProps {
  packs: RemotePackMeta[];
  onImportPack: (packId: string) => void;
  importedPackIds: Set<string>;
}

/**
 * Placeholder Bank list – will be replaced with remote-fetch implementation.
 * Displays each pack as a card with dashed neon border and an ⬇️ Import button.
 */
export const BankView: React.FC<BankViewProps> = ({ packs, onImportPack, importedPackIds }) => {
  if (packs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Loading packs…
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2 px-1 overflow-y-auto">
      {packs.map((pack) => (
        <div
          key={pack.id}
          className={cn(
            'border border-dashed rounded-md p-3 flex justify-between items-center backdrop-blur-sm',
            importedPackIds.has(pack.id)
              ? 'border-slate-600 opacity-50'
              : 'border-cyan-500/60'
          )}
        >
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-100">{pack.name}</span>
            {pack.description && (
              <span className="text-xs text-slate-400 mt-0.5">{pack.description}</span>
            )}
          </div>
          {!importedPackIds.has(pack.id) && (
            <Button size="sm" variant="ghost" onClick={() => onImportPack(pack.id)}>
              <CloudDownload size={14} className="mr-1" /> Import
            </Button>
          )}
          {importedPackIds.has(pack.id) && (
            <span className="text-xs text-cyan-400">Imported</span>
          )}
        </div>
      ))}
    </div>
  );
};
