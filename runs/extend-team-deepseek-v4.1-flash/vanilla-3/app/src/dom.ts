export type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown>;

function append(parent: Node, child: Child): void {
  if (child === null || child === undefined || child === false) return;
  if (Array.isArray(child)) for (const c of child) append(parent, c);
  else parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
}

/** Creates an element. `on*` attributes become event listeners; `class` sets the class name. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'class') {
      el.className = String(value);
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  append(el, children);
  return el;
}

export function fragment(...children: Child[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  append(frag, children);
  return frag;
}

let uid = 0;
export const uniqueId = (prefix: string) => `${prefix}-${++uid}`;
