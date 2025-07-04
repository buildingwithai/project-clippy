import React, { useEffect, useState } from 'react';
import Switch from '@/components/ui/switch';
import { CustomTooltip } from '@/components/ui/custom-tooltip';

import { TopTab } from './TopTabs';

interface Props {
  activeTab: TopTab;
  setActiveTab: (t: TopTab) => void;
}

export const BankToggle: React.FC<Props> = ({ activeTab, setActiveTab }) => {
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    (async () => {
      const { hasSeenBank } = await chrome.storage.local.get('hasSeenBank');
      if (!hasSeenBank) {
        setShowPulse(true);
      }
    })();
  }, []);

  const handleBankClick = () => {
    setActiveTab('bank');
    if (showPulse) {
      setShowPulse(false);
      chrome.storage.local.set({ hasSeenBank: true });
    }
  };

  const handleToggleChange = (checked: boolean) => {
    if (checked) handleBankClick();
    else setActiveTab('all');
  };

  return (
    <div className="flex items-center mr-2">
      <div className="relative">
        {showPulse && (
          <span className="pointer-events-none absolute -inset-1 rounded-full bg-cyan-400 opacity-75 animate-ping" />
        )}
        <CustomTooltip content={activeTab === 'bank' ? 'Snippet Bank' : 'All Snippets'}>
          <div className="inline-block">
            <Switch checked={activeTab === 'bank'} onCheckedChange={handleToggleChange} />
          </div>
        </CustomTooltip>
      </div>
    </div>
  );
};
