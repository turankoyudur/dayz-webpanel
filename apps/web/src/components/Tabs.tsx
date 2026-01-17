import React from 'react';

export type TabItem = { key: string; label: string };

export function Tabs({ items, active, onChange }: { items: TabItem[]; active: string; onChange: (key: string) => void }): JSX.Element {
  return (
    <div className="tabs">
      {items.map((it) => (
        <button
          key={it.key}
          className={`tab ${active === it.key ? 'active' : ''}`}
          onClick={() => onChange(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
