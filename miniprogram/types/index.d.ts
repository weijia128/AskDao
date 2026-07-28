interface IAppOption {
  globalData: {
    appName: string
  }
}

declare function App<T = Record<string, unknown>>(options: T): void
declare function Page<T = Record<string, unknown>>(options: T): void
declare function Component<T = Record<string, unknown>>(options: T): void
declare function require(path: string): any

interface CanvasGradientLike {
  addColorStop(stop: number, color: string): void
}

interface CanvasContextLike {
  drawImage(src: string, x: number, y: number, width: number, height: number): void
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradientLike
  createCircularGradient(x: number, y: number, radius: number): CanvasGradientLike
  setFillStyle(style: string | CanvasGradientLike): void
  fillRect(x: number, y: number, width: number, height: number): void
  setStrokeStyle(style: string): void
  setLineWidth(width: number): void
  strokeRect(x: number, y: number, width: number, height: number): void
  setFontSize(size: number): void
  setTextAlign(align: 'left' | 'center' | 'right'): void
  fillText(text: string, x: number, y: number): void
  draw(reserve?: boolean, callback?: () => void): void
}

declare const wx: {
  navigateTo(options: { url: string }): void
  setStorageSync(key: string, value: unknown): void
  getStorageSync<T = any>(key: string): T
  removeStorageSync(key: string): void
  showModal(options: {
    title: string
    content?: string
    showCancel?: boolean
    confirmText?: string
    confirmColor?: string
    success?: (res: { confirm: boolean; cancel: boolean }) => void
  }): void
  showToast(options: { title: string; icon?: 'success' | 'error' | 'loading' | 'none' }): void
  createCanvasContext(canvasId: string, component?: unknown): CanvasContextLike
  canvasToTempFilePath(
    options: {
      canvasId: string
      width?: number
      height?: number
      destWidth?: number
      destHeight?: number
      fileType?: 'jpg' | 'png'
      quality?: number
      success?: (res: { tempFilePath: string }) => void
      fail?: (err: unknown) => void
    },
    component?: unknown,
  ): void
  saveImageToPhotosAlbum(options: {
    filePath: string
    success?: () => void
    fail?: (err: unknown) => void
    complete?: () => void
  }): void
  showShareImageMenu(options: {
    path: string
    needShowEntrance?: boolean
    entrancePath?: string
    success?: () => void
    fail?: (err: unknown) => void
    complete?: () => void
  }): void
  reportAnalytics(eventName: string, data?: Record<string, unknown>): void
  getEnterOptionsSync?(): { scene: number; path?: string; query?: Record<string, string> }
  onKeyboardHeightChange?(callback: (res: { height: number }) => void): void
  base64ToArrayBuffer(value: string): ArrayBuffer
}
