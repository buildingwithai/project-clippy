import React from 'react';
import { Banknote, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type TopTab = 'all' | 'bank';

interface TopTabsProps {
  activeTab: TopTab;
  setActiveTab: (tab: TopTab) => void;
}

export const TopTabs: React.FC<TopTabsProps> = ({ activeTab, setActiveTab }) => {
  const tabBtnCls = (tab: TopTab) =>
    cn(
      'flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors',
      activeTab === tab
        ? 'bg-sky-700 text-sky-100'
        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700'
    );

  return (
    <div className="flex items-center space-x-2">
      <Button variant="ghost" size="sm" className={tabBtnCls('all')} onClick={() => setActiveTab('all')}>
        <List size={12} />
        <span>All Snippets</span>
      </Button>

      <Button variant="ghost" size="sm" className={tabBtnCls('bank')} onClick={() => setActiveTab('bank')}>
        {/* Banknote icon approximates vault; could replace later */}
        <Banknote size={12} />
        <span>Bank</span>
      </Button>
    </div>
  );
};
