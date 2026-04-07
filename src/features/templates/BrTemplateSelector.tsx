import React from 'react';
import type { NoteTemplate } from '../../types';
import { FileText, CheckSquare, Notebook, Code, Lightbulb } from 'lucide-react';

// ============================================================
// BrTemplateSelector - Linear 极简风格模板选择器
// ============================================================

export interface BrTemplateSelectorProps {
  value: NoteTemplate;
  onChange: (template: NoteTemplate) => void;
}

const templates: { type: NoteTemplate; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  {
    type: 'blank',
    label: '空白',
    icon: FileText,
    description: '从空白页开始',
  },
  {
    type: 'todo',
    label: '待办',
    icon: CheckSquare,
    description: '带复选框的任务列表',
  },
  {
    type: 'note',
    label: '笔记',
    icon: Notebook,
    description: '结构化笔记',
  },
  {
    type: 'snippet',
    label: '代码片段',
    icon: Code,
    description: '记录代码和技术片段',
  },
  {
    type: 'idea',
    label: '想法',
    icon: Lightbulb,
    description: '快速记录灵感',
  },
];

const BrTemplateSelector: React.FC<BrTemplateSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="grid grid-cols-5 gap-2">
      {templates.map((tpl) => {
        const isSelected = value === tpl.type;
        const Icon = tpl.icon;

        return (
          <button
            key={tpl.type}
            onClick={() => onChange(tpl.type)}
            className={`
              flex flex-col items-center gap-1.5 py-3 px-2 rounded-md transition-colors duration-150
              ${isSelected
                ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)]'
                : 'hover:bg-gray-100 dark:hover:bg-[#1A1A1A] text-gray-500 dark:text-gray-400'
              }
            `}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[12px] font-medium">{tpl.label}</span>
            <span className="text-[10px] text-gray-400 text-center leading-tight">
              {tpl.description}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default BrTemplateSelector;
