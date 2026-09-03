import { initBotId } from 'botid/client/core';

/**
 * BotID Basic (free auf jedem Plan, siehe vercel.com/docs/botid) für den
 * Rechner-Server-Action-Endpunkt. checkLevel bewusst auf 'basic' fixiert —
 * 'deepAnalysis' kostet ab Pro-Plan pro Aufruf und würde ohne Rückfrage Kosten
 * verursachen; das Team ist aktuell auf Hobby.
 *
 * Ohne diese Client-Instrumentierung stuft checkBotId() serverseitig in
 * Produktion JEDE Anfrage als Bot ein (siehe next.config.ts withBotId) —
 * der Rechner wäre für reguläre Nutzer komplett funktionslos, ohne dass ein
 * Fehler geloggt wird (Server Action liefert einfach {status:'blocked'}).
 */
initBotId({
  protect: [
    {
      path: '/rechner',
      method: 'POST',
      advancedOptions: { checkLevel: 'basic' },
    },
  ],
});
