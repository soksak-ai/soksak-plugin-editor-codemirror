// 마운트된 에디터 뷰어 추적기 — editor.* 명령(save/find/replace/format)이 이 통로로 동작한다.
// 코어 fileViewBridge 의 플러그인-내부판: CodeViewer 가 마운트 시 viewId 로 자기 핸들을 등록,
// 언마운트 시 해제. 명령은 명시 view(viewId) 또는 마지막 활성 뷰어를 대상으로 한다.

export interface FindOpts {
  caseSensitive?: boolean;
  regexp?: boolean;
  wholeWord?: boolean;
}

export interface ViewerHandle {
  path: string;
  save: () => Promise<{ saved: boolean; reason?: string }>;
  find: (query: string, opts: FindOpts) => { matches: number };
  replace: (
    query: string,
    replacement: string,
    opts: FindOpts & { all?: boolean },
  ) => { replaced: number };
  format: () => Promise<{ formatted: boolean; reason?: string }>;
  getText: () => string | null;
  setText: (text: string) => boolean;
  openFind: (replace: boolean) => void;
}

const handles = new Map<string, ViewerHandle>();
let active: string | null = null;

export function setHandle(viewId: string, h: ViewerHandle): void {
  handles.set(viewId, h);
  active = viewId; // 새로 마운트된 뷰어가 활성
}

export function clearHandle(viewId: string): void {
  const had = handles.delete(viewId);
  if (had && active === viewId) active = null;
}

export function markActive(viewId: string): void {
  if (handles.has(viewId)) active = viewId;
}

// 명령이 실제로 대상 삼을 뷰 id — resolveHandle 과 동일 규칙(단일 진실), 응답 자기기술(viewId)에 재사용.
export function resolveTargetId(viewId?: string): string | undefined {
  const key = viewId ?? active ?? undefined;
  return key != null && handles.has(key) ? key : undefined;
}

export function resolveHandle(viewId?: string): ViewerHandle | undefined {
  const key = resolveTargetId(viewId);
  return key != null ? handles.get(key) : undefined;
}

export function activeViewId(): string | null {
  return active;
}
