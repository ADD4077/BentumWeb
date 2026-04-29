import React from 'react';

function ToggleRow({ item, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-4 shadow-sm dark:border-slate-700/60 dark:bg-[#17202d]">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {item.label}
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {item.description}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(item.key)}
        aria-pressed={value}
        className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
          value ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function PreferenceSettingsSection({
  title,
  description,
  items,
  values,
  onToggle,
}) {
  return (
    <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60 sm:p-8">
      <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">{description}</p>

      <div className="space-y-3">
        {items.map((item) => (
          <ToggleRow
            key={item.key}
            item={item}
            value={Boolean(values[item.key])}
            onChange={onToggle}
          />
        ))}
      </div>
    </div>
  );
}
