interface IAppOption {
  globalData: {
    appName: string
  }
}

declare function App<T = Record<string, unknown>>(options: T): void
declare function Page<T = Record<string, unknown>>(options: T): void
declare function Component<T = Record<string, unknown>>(options: T): void

declare const wx: {
  navigateTo(options: { url: string }): void
  setStorageSync(key: string, value: unknown): void
  getStorageSync<T = unknown>(key: string): T
  showModal(options: { title: string; content?: string; showCancel?: boolean }): void
  showToast(options: { title: string; icon?: 'success' | 'error' | 'loading' | 'none' }): void
}
