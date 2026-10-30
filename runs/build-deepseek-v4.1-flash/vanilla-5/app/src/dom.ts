export type Child = Node | string | number | null | undefined | Child[];

export interface Attrs {
  [key: string]: string | number | boolean | EventListener | null | undefined;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') {
      node.className = String(value);
    } else if (key === 'text') {
      node.textContent = String(value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }
  append(node, children);
  return node;
}

export function append(parent: Node, children: Child | Child[]): void {
  if (Array.isArray(children)) {
    for (const child of children) append(parent, child);
    return;
  }
  if (children === null || children === undefined) return;
  if (children instanceof Node) {
    parent.appendChild(children);
  } else {
    parent.appendChild(document.createTextNode(String(children)));
  }
}

export function clear(node: Element): void {
  node.replaceChildren();
}

export function section(id: string, title: string, ...children: Child[]): HTMLElement {
  const headingId = `${id}-heading`;
  return h(
    'section',
    { class: 'panel', id, 'aria-labelledby': headingId },
    h('h2', { id: headingId }, title),
    ...children,
  );
}

export function pageContainer(...children: Child[]): HTMLElement {
  return h('div', { class: 'container page' }, ...children);
}
