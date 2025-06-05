import * as React from 'react';
import { Smile } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

// Custom styles for the emoji picker
const pickerStyles = {
  '--epr-emoji-size': '16px',
  '--epr-category-label-height': '24px',
  '--epr-category-label-padding': '8px 12px',
  '--epr-emoji-padding': '4px',
  '--epr-search-padding': '8px',
  '--epr-header-padding': '8px',
  '--epr-category-navigation-button-size': '24px',
  '--epr-header-overlay-height': '40px',
  '--epr-preview-height': '40px',
  '--epr-preview-padding': '0 8px',
  '--epr-search-input-padding': '4px 8px',
  '--epr-search-input-height': '28px',
  '--epr-category-padding': '4px',
  '--epr-emoji-variation-picker-height': '24px',
  '--epr-emoji-variation-picker-width': '24px',
  '--epr-category-size': '20px',
  '--epr-emoji-fullsize': '20px',
  '--epr-bg-color': 'rgb(30, 41, 59)',
  '--epr-category-label-bg-color': 'rgb(30, 41, 59)',
  '--epr-category-label-text-color': 'rgb(148, 163, 184)',
  '--epr-search-input-bg-color': 'rgb(51, 65, 85)',
  '--epr-search-input-text-color': 'rgb(241, 245, 249)',
  '--epr-search-input-placeholder-color': 'rgb(148, 163, 184)',
  '--epr-search-border-color': 'rgb(51, 65, 85)',
  '--epr-picker-border-color': 'rgb(51, 65, 85)',
  '--epr-category-icon-active-color': 'rgb(56, 189, 248)',
  '--epr-emoji-hover-bg-color': 'rgba(100, 116, 139, 0.5)',
  '--epr-preview-bg-color': 'transparent',
  '--epr-preview-text-color': 'rgb(241, 245, 249)',
  '--epr-preview-border-color': 'transparent',
};

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  buttonClassName?: string;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  value = '📁',
  onChange,
  buttonClassName = '',
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            'h-8 w-8 p-0 text-lg flex items-center justify-center',
            buttonClassName
          )}
        >
          {value || <Smile className="h-4 w-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 border-slate-700 bg-slate-800 overflow-hidden"
        style={{
          width: '280px',
          padding: '4px',
        }}
      >
        <div style={{
          ...pickerStyles as React.CSSProperties,
          width: '100%',
          height: '300px',
          overflow: 'hidden',
        }}>
          <Picker
            data={data}
            theme="dark"
            onEmojiSelect={(emoji: any) => {
              onChange(emoji.native);
              // Close the picker after selection
              const trigger = document.querySelector(`[data-state="open"]`);
              (trigger as HTMLElement)?.click();
            }}
            previewPosition="none"
            searchPosition="sticky"
            skinTonePosition="none"
            perLine={8}
            emojiSize={20}
            emojiButtonSize={28}
            maxFrequentRows={1}
            navPosition="bottom"
            searchPlaceholder="Search emojis..."
            categories={['frequent', 'people', 'nature', 'foods', 'activity', 'places', 'objects', 'symbols', 'flags']}
            autoFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
