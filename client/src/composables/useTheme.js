import { ref, watch } from 'vue'

const STORAGE_KEY = 'theme'

// Read initial theme from localStorage; fall back to OS preference, then 'light'.
function readInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

// Singleton ref shared by every caller of useTheme()
const theme = ref(readInitialTheme())

// Mirror the ref onto <html data-theme="..."> so CSS can target it,
// and persist so the choice survives page reloads.
function applyTheme(value) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', value)
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, value)
  }
}

applyTheme(theme.value)
watch(theme, applyTheme)

export function useTheme() {
  const toggle = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }
  return { theme, toggle }
}
