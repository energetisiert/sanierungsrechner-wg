import type { ReactNode } from 'react';

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13.5px] font-semibold text-strong">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12.5px] text-muted2">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-strong/50 bg-bg px-3.5 py-2.5 text-[14.5px] text-ink outline-none transition-colors focus:border-ac';

/** auto = true zeichnet das Feld grün gestrichelt: "automatisch aus der Gewerke-Kostenschätzung übernommen, überschreibbar". */
export function TextInput({ auto, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { auto?: boolean }) {
  return <input {...props} className={`${inputClass} ${auto ? 'input-auto' : ''} ${props.className ?? ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function Checkbox({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input type="checkbox" {...props} className="mt-0.5 size-4 flex-none accent-ac" />
      <span>
        <span className="block text-[13.5px] font-semibold text-strong">{label}</span>
        {hint && <span className="block text-[12.5px] text-muted2">{hint}</span>}
      </span>
    </label>
  );
}
