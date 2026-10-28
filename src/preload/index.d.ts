import type { ElectronAPI } from '@electron-toolkit/preload'
import type { Api } from '@shared/tipos'

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
