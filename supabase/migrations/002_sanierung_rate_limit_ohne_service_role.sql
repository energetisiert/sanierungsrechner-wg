-- =====================================================================
-- Rate Limiting ohne Service-Role-Key
-- =====================================================================
-- Einheitlich mit dem CO2-/Förderrechner-Muster: sanierung_rate_limit_hit
-- bleibt SECURITY DEFINER und zählt/prüft atomar serverseitig — der
-- aufrufende Client braucht dafür nur noch den öffentlichen publishable/
-- anon Key, nicht SUPABASE_SERVICE_ROLE_KEY. Die zugrunde liegende Tabelle
-- bleibt für anon/authenticated per RLS ohne Policies weiterhin vollständig
-- gesperrt — nur der Weg über die Funktion ist erlaubt.

grant execute on function public.sanierung_rate_limit_hit(text, int) to anon, authenticated;
