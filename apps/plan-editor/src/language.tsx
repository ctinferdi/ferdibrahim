import React, { useEffect, useSyncExternalStore } from 'react';
import { translateLabel, type Language } from './translations';

const KEY = 'insaat-editor-language';
let language: Language = 'tr';
try { language = localStorage.getItem(KEY) === 'en' ? 'en' : 'tr'; } catch { /* Private browsing may disallow preferences. */ }
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const currentLanguage = () => language;
export const uiText = (text: string) => translateLabel(text, language);
export function LanguageSelector() {
  const current = useSyncExternalStore(subscribe, currentLanguage);
  return <label data-i18n-skip className="language-selector">🌐<select aria-label="Language / Dil" value={current} onChange={e => {
    language = e.target.value === 'en' ? 'en' : 'tr';
    try { localStorage.setItem(KEY, language); } catch { /* UI still changes without persistence. */ }
    listeners.forEach(listener => listener());
  }}><option value="tr">Türkçe</option><option value="en">English</option></select></label>;
}

// The imported editor has no locale API. Adapt only known static UI labels;
// preserve React's nodes, user inputs, scene data, project names and DOM identity.
// Portals and lazily mounted tool panels are covered by the same observer.
export function LanguageBridge() {
  const current = useSyncExternalStore(subscribe, currentLanguage);
  useEffect(() => {
    const originals = new WeakMap<Node, { original: string; rendered: string }>();
    const attributes = new WeakMap<Element, Map<string, { original: string; rendered: string }>>();
    const skip = (element: Element | null) => !element || Boolean(element.closest('[data-i18n-skip],input,textarea,[contenteditable],script,style,svg'));
    const text = (node: Node) => {
      if (skip(node.parentElement) || !node.nodeValue?.trim()) return;
      const cached = originals.get(node);
      const original = cached && node.nodeValue === cached.rendered ? cached.original : node.nodeValue;
      const rendered = translateLabel(original, language);
      originals.set(node, { original, rendered });
      if (node.nodeValue !== rendered) node.nodeValue = rendered;
    };
    const visit = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) { text(root); return; }
      if (!(root instanceof Element) || root.closest('[data-i18n-skip],script,style,svg')) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) text(walker.currentNode);
      for (const element of [root, ...root.querySelectorAll('[title],[aria-label],[placeholder],[alt]')]) {
        if (element.closest('[data-i18n-skip]')) continue;
        let saved = attributes.get(element); if (!saved) { saved = new Map(); attributes.set(element, saved); }
        for (const attr of ['title','aria-label','placeholder','alt']) {
          const value = element.getAttribute(attr); if (!value) continue;
          const cached = saved.get(attr), original = cached && value === cached.rendered ? cached.original : value;
          const rendered = translateLabel(original, language); saved.set(attr, { original, rendered });
          if (rendered !== value) element.setAttribute(attr, rendered);
        }
      }
    };
    const observer = new MutationObserver(records => {
      observer.disconnect();
      for (const record of records) {
        if (record.type === 'characterData') text(record.target);
        else if (record.type === 'attributes') visit(record.target);
        else record.addedNodes.forEach(visit);
      }
      observe();
    });
    const observe = () => observer.observe(document.body, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['title','aria-label','placeholder','alt'] });
    document.documentElement.lang = current;
    visit(document.body); observe();
    return () => observer.disconnect();
  }, [current]);
  return null;
}
