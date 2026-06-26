'use client';

import React from 'react';

interface RenderMarkdownProps {
  text: string;
}

export function RenderMarkdown({ text }: RenderMarkdownProps) {
  if (!text) return null;
  
  const blocks = text.split('\n');
  return (
    <>
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;

        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-base font-black mt-5 mb-2 text-indigo-600 dark:text-indigo-400 tracking-tight">
              {trimmed.replace('### ', '')}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-lg font-black mt-6 mb-3 text-foreground border-b border-border/60 pb-1.5 tracking-tight">
              {trimmed.replace('## ', '')}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={idx} className="text-xl font-black mt-8 mb-4 text-foreground tracking-tight">
              {trimmed.replace('# ', '')}
            </h2>
          );
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.replace(/^[-*]\s+/, '');
          const parts = content.split('**');
          return (
            <li key={idx} className="ml-5 list-disc text-sm my-1 text-muted-foreground leading-relaxed">
              {parts.map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="font-semibold text-foreground">{part}</strong> : part)}
            </li>
          );
        }

        const parts = trimmed.split('**');
        return (
          <p key={idx} className="text-sm my-2 text-muted-foreground leading-relaxed">
            {parts.map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="font-bold text-foreground">{part}</strong> : part)}
          </p>
        );
      })}
    </>
  );
}
