import type { ReactNode } from 'react';

export function Card({
  title,
  eyebrow,
  action,
  children,
  className = '',
}: {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`print-break-avoid rounded-[20px] border border-black/[0.08] bg-white p-[18px] sm:p-[22px] ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {eyebrow && <p className="font-disp text-[11px] font-bold tracking-[0.14em] text-ac uppercase">{eyebrow}</p>}
            {title && <h3 className="font-disp text-[16.5px] font-bold tracking-tight text-ink sm:text-[17.5px]">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
