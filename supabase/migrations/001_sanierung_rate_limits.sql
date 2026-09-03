-- =====================================================================
-- Sanierungsrechner WG — Rate Limiting (Bulletproof Layer)
-- =====================================================================
-- Max. 60 Berechnungen pro Minute je ip_hash. Der Hash wird serverseitig
-- als SHA-256(IP + IP_SALT) gebildet (src/lib/security/guards.ts) — es
-- werden keine Klardaten-IPs gespeichert (DSGVO). Zugriff ausschließlich
-- über den Service-Role-Key; für anon/authenticated ist die Tabelle durch
-- RLS ohne Policies vollständig gesperrt.
--
-- ACHTUNG (Stand 2026-09-02): Dieser Absatz war von Anfang an falsch bzw.
-- ist inzwischen ueberholt -- es gibt kein eigenstaendiges Projekt. Die App
-- verwendet ausschliesslich das geteilte Projekt "Tool Hub energetisiert." (gleiche
-- NEXT_PUBLIC_SUPABASE_URL wie proxy.ts fuer zugriffsstatus() und
-- guards.ts fuer das Rate-Limiting), diese Tabelle liegt also im selben
-- Projekt wie Auth/Entitlement-Daten. Seit der Rate-Limit-Konsolidierung
-- laeuft die Zaehlung zudem ueber die geteilte Funktion
-- public.rate_limit_hit() statt ueber sanierung_rate_limit_hit() unten.

create table if not exists public.sanierung_rate_limits (
  id             uuid primary key default gen_random_uuid(),
  ip_hash        text not null,
  window_start   timestamptz not null,
  request_count  int not null default 0,
  unique (ip_hash, window_start)
);

comment on table public.sanierung_rate_limits is
  'Minutenfenster-Zähler je SHA-256(IP + Salt) für den Sanierungsrechner WG. Keine Klardaten-IPs (DSGVO).';

create index if not exists sanierung_rate_limits_window_start_idx on public.sanierung_rate_limits (window_start);

alter table public.sanierung_rate_limits enable row level security;
-- bewusst KEINE Policies: nur der Service-Role-Key (umgeht RLS) liest und schreibt.

-- ---------------------------------------------------------------------
-- RPC: zählt den Request im aktuellen Minutenfenster und meldet, ob die
-- Anfrage noch innerhalb des Limits liegt. security definer + fester
-- search_path (Supabase Security Advisor).
-- ---------------------------------------------------------------------
create or replace function public.sanierung_rate_limit_hit(p_ip_hash text, p_limit int default 60)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := date_trunc('minute', now());
  v_count  int;
begin
  insert into public.sanierung_rate_limits (ip_hash, window_start, request_count)
  values (p_ip_hash, v_window, 1)
  on conflict (ip_hash, window_start)
  do update set request_count = sanierung_rate_limits.request_count + 1
  returning request_count into v_count;

  -- Fenster älter als eine Stunde gelegentlich aufräumen (kein pg_cron nötig)
  if random() < 0.01 then
    delete from public.sanierung_rate_limits where window_start < now() - interval '1 hour';
  end if;

  return v_count <= p_limit;
end;
$$;

-- Kein öffentlicher RPC-Endpunkt: nur die Service Role darf die Funktion aufrufen
-- (wird durch Migration 002 für anon/authenticated freigegeben).
revoke execute on function public.sanierung_rate_limit_hit(text, int) from public, anon, authenticated;
