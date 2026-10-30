export interface PageContext {
  main: HTMLElement;
  params: URLSearchParams;
  isCurrent: () => boolean;
  setTitle: (title: string) => void;
}
