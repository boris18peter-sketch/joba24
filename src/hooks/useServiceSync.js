import { useCallback, useEffect, useRef, useState } from 'react';
import { getCategoryKeywords } from '@/lib/taskFlowConfig';
import { getCategoryLabel } from '@/lib/categories';
import { bestServiceForText } from '@/lib/descriptionCategoryMatch';

/**
 * Keeps the chosen service in step with what the publisher actually wrote.
 *
 * A publisher describes the job in their own words and picks the service from a
 * list that often does not use the same word. When the two disagreed the form
 * only drew an orange line under the text and the publish then failed with no
 * explanation, so the button looked dead. Every keyword already exists in the
 * catalogue, so the service can simply follow the text.
 *
 * It only moves when the CHOSEN service has no keyword in the text at all and
 * another OFFERED service does — a service the publisher picked and that matches
 * is never traded away. The description is never touched: it is the source.
 *
 * `serviceSignature` is the offered services joined with '|', which keeps the
 * effect stable across re-renders (an array prop would restart the timer every
 * render and the sync would never actually fire).
 */
export default function useServiceSync({
  enabled,
  text,
  serviceSignature,
  map,
  currentKey,
  onSwitch,
  translate,
}) {
  const [note, setNote] = useState(null);
  // The translator's identity can change without the text changing; a ref keeps
  // it out of the callback's dependencies so the debounce is never restarted.
  const translateRef = useRef(translate);
  translateRef.current = translate;
  // Same reason for the switch callback: an inline arrow would be a new value on
  // every render and would restart the debounce each time.
  const onSwitchRef = useRef(onSwitch);
  onSwitchRef.current = onSwitch;

  const sync = useCallback(() => {
    // An EMPTY selection is the case this must not skip: a publisher who picked
    // only the main category ("חשמל") and then wrote the job out has exactly the
    // information needed to name the service, and requiring a choice first is
    // what made the description count for nothing and blocked publishing.
    if (!enabled) return null;
    const services = String(serviceSignature || '').split('|').filter(Boolean);
    if (services.length < 2) return null;

    const next = bestServiceForText({
      text,
      services,
      keywordsFor: (key) => getCategoryKeywords(key) || [],
      map,
      currentKey,
    });
    if (!next || next === currentKey) return null;

    onSwitchRef.current?.(next);
    const say = translateRef.current;
    const label = typeof say === 'function' ? getCategoryLabel(next, say) : next;
    setNote({ to: label });
    return label;
  }, [enabled, text, serviceSignature, map, currentKey]);

  useEffect(() => {
    if (!enabled) return undefined;
    if (String(text || '').trim().length < 12) return undefined;
    const timer = setTimeout(() => { sync(); }, 700);
    return () => clearTimeout(timer);
  }, [enabled, text, sync]);

  return { sync, note, clearNote: useCallback(() => setNote(null), []) };
}