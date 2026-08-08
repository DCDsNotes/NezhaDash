const INJECTION_MARK = "data-injected"
const injectedNodes = new Set<Node>()

function appendInjected(parent: HTMLElement, node: Node) {
  if (node instanceof HTMLElement) node.setAttribute(INJECTION_MARK, "true")
  injectedNodes.add(node)
  parent.appendChild(node)
}

function cleanInjectedResources() {
  injectedNodes.forEach((node) => node.parentNode?.removeChild(node))
  injectedNodes.clear()
  document.querySelectorAll(`[${INJECTION_MARK}]`).forEach((node) => node.remove())
}

export function clearInjectedContext() {
  cleanInjectedResources()
}

function loadExternalScript(source: HTMLScriptElement) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = source.src
    script.async = false
    if (source.type) script.type = source.type
    if (source.integrity) script.integrity = source.integrity
    if (source.crossOrigin) script.crossOrigin = source.crossOrigin
    if (source.referrerPolicy) script.referrerPolicy = source.referrerPolicy
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load custom script: ${source.src}`))
    appendInjected(document.head, script)
  })
}

function executeInlineScript(source: HTMLScriptElement) {
  const script = document.createElement("script")
  if (source.type) script.type = source.type
  script.textContent = source.textContent
  appendInjected(document.body, script)
}

function loadStylesheet(source: HTMLLinkElement) {
  return new Promise<void>((resolve, reject) => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = source.href
    if (source.integrity) link.integrity = source.integrity
    if (source.crossOrigin) link.crossOrigin = source.crossOrigin
    if (source.referrerPolicy) link.referrerPolicy = source.referrerPolicy
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to load custom stylesheet: ${source.href}`))
    appendInjected(document.head, link)
  })
}

/**
 * Executes the trusted custom_code returned by the Nezha panel.
 * This is intentionally privileged for compatibility with panel templates;
 * only connect this frontend to a panel instance you control.
 */
export async function injectContext(content: string) {
  cleanInjectedResources()
  if (!content) return

  const fragment = document.createRange().createContextualFragment(content)
  for (const node of Array.from(fragment.childNodes)) {
    if (!(node instanceof HTMLElement)) {
      appendInjected(document.body, node)
      continue
    }

    if (node instanceof HTMLScriptElement) {
      if (node.src) await loadExternalScript(node)
      else executeInlineScript(node)
      continue
    }

    if (node instanceof HTMLStyleElement || node instanceof HTMLMetaElement) {
      appendInjected(document.head, node)
      continue
    }

    if (node instanceof HTMLLinkElement && node.rel.toLowerCase() === "stylesheet") {
      await loadStylesheet(node)
      continue
    }

    appendInjected(document.body, node)
  }
}
