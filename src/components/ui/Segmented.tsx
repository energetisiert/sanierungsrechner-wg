'use client';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  'aria-label': string;
}

export function Segmented<T extends string>({ value, onChange, options, ...rest }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={rest['aria-label']}
      className="inline-flex flex-wrap rounded-full border border-strong/60 bg-tint p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`flex min-h-11 items-center justify-center rounded-full px-[18px] text-[13.5px] font-semibold transition-colors ${
              active ? 'bg-doc text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
