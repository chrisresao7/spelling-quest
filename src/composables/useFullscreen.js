// Full screen hides the browser's address bar (Silk on the Fire tablet, Chrome, Safari on iPad).
// Browsers only allow it straight after a tap, so it can't happen on its own when the page
// opens. Instead, once Big screen has been pressed on a device, the game remembers it and goes
// full screen again on the first tap anywhere next time (and after the Back gesture leaves it).
// Small screen turns that off. The choice is per device, kept with the progress.
import { ref } from 'vue'
import { useProgress } from '../stores/progress.js'

const root = document.documentElement
const enter = root.requestFullscreen || root.webkitRequestFullscreen
const leave = document.exitFullscreen || document.webkitExitFullscreen
const current = () => document.fullscreenElement || document.webkitFullscreenElement

export const supported = !!enter && !!(document.fullscreenEnabled ?? document.webkitFullscreenEnabled)
/** Opened from a home-screen icon that already fills the screen (manifest.webmanifest). */
export const launchedFull = !!window.matchMedia?.('(display-mode: fullscreen)').matches && !current()
export const isFull = ref(!!current())

for (const e of ['fullscreenchange', 'webkitfullscreenchange']) {
  document.addEventListener(e, () => (isFull.value = !!current()))
}

async function goFull() {
  try {
    await enter.call(root)
  } catch {
    // Refused (for example a kids' browser that doesn't allow it). Nothing to do.
  }
}

export function useFullscreen() {
  const progress = useProgress()

  async function toggle() {
    if (current()) {
      progress.settings.bigScreen = false
      try {
        await leave.call(document)
      } catch {
        // Already left.
      }
    } else {
      progress.settings.bigScreen = true
      await goFull()
    }
  }

  /** Call once when the game starts: goes full screen on any tap if this device chose it. */
  function autoEnter() {
    if (!supported || launchedFull) return
    document.addEventListener(
      'click',
      () => {
        if (progress.settings.bigScreen && !current()) goFull()
      },
      { capture: true },
    )
  }

  return { supported, launchedFull, isFull, toggle, autoEnter }
}
