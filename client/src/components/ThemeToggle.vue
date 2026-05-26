<template>
  <button
    class="theme-toggle"
    @click="toggle"
    :aria-label="t('theme.toggle')"
    :title="t('theme.toggle')"
  >
    <!-- Sun icon: shown in dark mode (clicking switches to light) -->
    <svg
      v-if="theme === 'dark'"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      class="theme-icon"
    >
      <circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.5"/>
      <path d="M10 2V4M10 16V18M2 10H4M16 10H18M4.22 4.22L5.64 5.64M14.36 14.36L15.78 15.78M15.78 4.22L14.36 5.64M5.64 14.36L4.22 15.78" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <!-- Moon icon: shown in light mode (clicking switches to dark) -->
    <svg
      v-else
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      class="theme-icon"
    >
      <path d="M17.5 11.5A7.5 7.5 0 118.5 2.5a5.5 5.5 0 009 9z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</template>

<script>
import { useTheme } from '../composables/useTheme'
import { useI18n } from '../composables/useI18n'

export default {
  name: 'ThemeToggle',
  setup() {
    const { theme, toggle } = useTheme()
    const { t } = useI18n()
    return { theme, toggle, t }
  }
}
</script>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-muted);
  flex-shrink: 0;
}

.theme-toggle:hover {
  background: var(--surface-alt);
  color: var(--text);
}

.theme-icon {
  flex-shrink: 0;
}
</style>
