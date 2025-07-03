import React, { useState, useMemo, useCallback } from "react";
import * as LucideIcons from "lucide-react";
import * as HeroIcons from "@heroicons/react/24/outline";
import * as IconoirIcons from "iconoir-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface IconPickerProps {
  value?: string; // e.g. 😀 or "lucide:Folder"
  onChange: (val: string) => void;
}

type IconSource = "emoji" | "lucide" | "hero" | "iconoir";

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [tab, setTab] = useState<IconSource>("emoji");
  const [query, setQuery] = useState("");

  const emojis = useMemo(() => {
    const list = [..."😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰🤩😜🤑🤓🤔🤨😐😑😶🙄😏😒😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😤😠😡🤬"].filter(
      (e) => e !== "\uFE0F"
    );
    return query
      ? list.filter((e) => e.includes(query))
      : list;
  }, [query]);

  const getIcons = useCallback(
    (src: IconSource): Array<{ key: string; element: React.ReactNode }> => {
      if (src === "lucide") {
        return Object.entries(LucideIcons)
          .filter(([name]) => name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 100)
          .map(([name, Comp]) => {
            const C = Comp as any;
            return {
              key: `lucide:${name}`,
              element: <C size={20} />,
            };
          });
      }
      if (src === "hero") {
        return Object.entries(HeroIcons)
          .filter(([name]) => name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 100)
          .map(([name, Comp]) => {
            const C = Comp as any;
            return {
              key: `hero:${name}`,
              element: <C className="h-5 w-5" />,
            };
          });
      }
      if (src === "iconoir") {
        return Object.entries(IconoirIcons)
          .filter(([name]) => name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 100)
          .map(([name, Comp]) => {
            const C = Comp as any;
            return {
              key: `iconoir:${name}`,
              element: <C width={20} height={20} />,
            };
          });
      }
      return [];
    },
    [query]
  );

  const renderGrid = (items: Array<{ key: string; element: React.ReactNode }>) => (
    <div className="grid grid-cols-8 gap-2 p-2 max-h-60 overflow-y-auto">
      {items.map((it) => (
        <button
          key={it.key}
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded hover:bg-slate-600",
            value === it.key && "bg-sky-700"
          )}
          onClick={() => onChange(it.key)}
        >
          {it.element}
        </button>
      ))}
    </div>
  );

  return (
    <div className="w-[280px] text-slate-200 select-none">
      <Input
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-2 h-8 bg-slate-700 border-slate-600 text-sm"
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as IconSource)} className="w-full">
        <TabsList className="grid grid-cols-4 mb-2 bg-slate-700">
          <TabsTrigger value="emoji">😀</TabsTrigger>
          <TabsTrigger value="lucide">Lucide</TabsTrigger>
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="iconoir">Iconoir</TabsTrigger>
        </TabsList>
        <TabsContent value="emoji">
          <div className="grid grid-cols-8 gap-2 p-2 max-h-60 overflow-y-auto">
            {emojis.map((e) => (
              <button
                key={e}
                className={cn(
                  "h-8 w-8 flex items-center justify-center rounded hover:bg-slate-600",
                  value === e && "bg-sky-700"
                )}
                onClick={() => onChange(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="lucide">{renderGrid(getIcons("lucide"))}</TabsContent>
        <TabsContent value="hero">{renderGrid(getIcons("hero"))}</TabsContent>
        <TabsContent value="iconoir">{renderGrid(getIcons("iconoir"))}</TabsContent>
      </Tabs>
    </div>
  );
};
