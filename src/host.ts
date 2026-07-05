// 코어 플러그인 API 중 에디터 플러그인이 쓰는 표면만 선언(별도 repo — 코어 소스 비의존, A7).
// 형태는 soksak-plugin-spec v1 의 app.* 와 동형. 미선언 권한 표면은 런타임에 undefined.

export interface Disposable {
  dispose(): void;
}

// 코어 fileViewerRegistry.FileViewerContext 와 동형 — 코어가 넘기는 유일한 채널(계약 A2).
export interface FileViewerContext {
  viewId: string;
  path: string;
  projectId: string;
  root: string | null;
  setDirty: (dirty: boolean) => void;
}

export interface FileViewerProvider {
  mount(container: HTMLElement, ctx: FileViewerContext): void;
  unmount?(container: HTMLElement): void;
}

export interface ParamSpec {
  type: string;
  description?: string;
  required?: boolean;
}

export interface PluginCommandSpec {
  description: string;
  triggers?: Record<string, string>;
  params?: Record<string, ParamSpec>;
  returns?: string;
  examples?: readonly string[];
  // 성공 data(handler 반환)로 한 줄 결과 발화를 합성. 코어 message 프로토콜.
  message?: (data: any) => string;
  handler: (params: Record<string, unknown>) => Promise<object> | object;
}

export interface PluginApi {
  pluginId: string;
  locale: () => string;
  commands?: {
    register: (name: string, spec: PluginCommandSpec) => Disposable;
  };
  events: {
    on: (event: string, fn: (payload: unknown) => void) => Disposable;
  };
  ui?: {
    registerFileViewer: (
      viewerId: string,
      provider: FileViewerProvider,
    ) => Disposable;
  };
  fs?: {
    readText?: (
      path: string,
      offset?: number,
    ) => Promise<{ text: string; truncated: boolean; totalBytes: number }>;
    writeText?: (path: string, content: string) => Promise<void>;
  };
  // 플러그인 간 pub/sub(코어 정의 이벤트와 별개, 권한 불요). 에디터 확장 프로토콜의 채널.
  bus: {
    emit: (topic: string, payload: unknown) => void;
    on: (topic: string, fn: (payload: unknown) => void) => Disposable;
  };
}

export interface PluginContext {
  app: PluginApi;
  manifest: unknown;
  dir: string;
  subscriptions: Disposable[];
}
