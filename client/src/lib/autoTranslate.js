// Runtime DOM auto-translator using MyMemory free API.
// Caches results in localStorage to stay within the free quota.

const CACHE_KEY = 'procuro_translations_v1'
const ORIGINAL_ATTR = 'data-orig-text'
const SKIP_SELECTOR = 'input, textarea, select, script, style, noscript, code, pre, [data-no-translate]'

let cache = {}
try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') } catch { cache = {} }

let saveTimer = null
function persistCache() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch {}
  }, 500)
}

const inFlight = new Map() // key -> Promise

async function translateOne(text, source, target) {
  const key = `${source}|${target}|${text}`
  if (cache[key]) return cache[key]
  if (inFlight.has(key)) return inFlight.get(key)

  const promise = (async () => {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}&de=procuro@app.local`
      const res = await fetch(url)
      if (!res.ok) return text
      const data = await res.json()
      const translated = data?.responseData?.translatedText
      if (typeof translated === 'string' && translated.length > 0 && !translated.startsWith('PLEASE SELECT')) {
        cache[key] = translated
        persistCache()
        return translated
      }
      return text
    } catch {
      return text
    } finally {
      inFlight.delete(key)
    }
  })()
  inFlight.set(key, promise)
  return promise
}

function shouldTranslateNode(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return false
  const raw = node.nodeValue
  if (!raw) return false
  const text = raw.trim()
  if (text.length < 2) return false
  if (!/[a-zA-Z]/.test(text)) return false
  // skip pure numbers, currency, IBANs
  if (/^[\d\s.,€$£%+\-:/]+$/.test(text)) return false
  const parent = node.parentElement
  if (!parent) return false
  if (parent.closest(SKIP_SELECTOR)) return false
  return true
}

function collectNodes(root) {
  const nodes = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => shouldTranslateNode(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  })
  let n
  while ((n = walker.nextNode())) nodes.push(n)
  return nodes
}

async function translateNode(node, source, target) {
  const original = node.parentElement?.getAttribute(ORIGINAL_ATTR) || node.nodeValue
  if (!node.parentElement) return
  // Preserve original on the parent (one text child assumption is OK for most cases;
  // for parents with multiple text children we use the current text as original).
  if (!node.parentElement.hasAttribute(ORIGINAL_ATTR)) {
    node.parentElement.setAttribute(ORIGINAL_ATTR, node.nodeValue)
  }
  const sourceText = original.trim()
  if (!sourceText) return
  const lead = original.match(/^\s*/)?.[0] || ''
  const trail = original.match(/\s*$/)?.[0] || ''
  const translated = await translateOne(sourceText, source, target)
  if (node.isConnected) {
    node.nodeValue = lead + translated + trail
  }
}

async function translateRoot(root, source, target) {
  const nodes = collectNodes(root)
  // Limit concurrency to avoid hammering the API
  const concurrency = 6
  let i = 0
  async function worker() {
    while (i < nodes.length) {
      const idx = i++
      await translateNode(nodes[idx], source, target)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
}

function restoreRoot(root) {
  const elements = root.querySelectorAll(`[${ORIGINAL_ATTR}]`)
  elements.forEach(el => {
    const orig = el.getAttribute(ORIGINAL_ATTR)
    // Replace only the first text child if structure matches
    const textChild = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim())
    if (textChild) textChild.nodeValue = orig
    el.removeAttribute(ORIGINAL_ATTR)
  })
}

let currentLang = 'en'
let observer = null

export function setActiveLanguage(lang) {
  currentLang = lang
  if (!document.body) return

  if (observer) {
    observer.disconnect()
    observer = null
  }

  if (lang === 'en') {
    restoreRoot(document.body)
    return
  }

  // Translate the existing DOM
  translateRoot(document.body, 'en', lang)

  // Watch for React re-renders / navigation and translate new nodes
  observer = new MutationObserver(mutations => {
    if (currentLang === 'en') return
    const roots = new Set()
    for (const m of mutations) {
      if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
        if (m.target.parentElement) roots.add(m.target.parentElement)
      }
      for (const added of m.addedNodes || []) {
        if (added.nodeType === Node.ELEMENT_NODE) roots.add(added)
        else if (added.nodeType === Node.TEXT_NODE && added.parentElement) roots.add(added.parentElement)
      }
    }
    roots.forEach(r => translateRoot(r, 'en', currentLang))
  })
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
}
