<template>
  <div class="alerts-wrapper">
    <button
      class="alerts-button"
      @click.stop="toggleDropdown"
      :aria-label="t('alerts.title')"
      :title="t('alerts.title')"
    >
      <!-- Bell icon -->
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="bell-icon">
        <path d="M10 2a6 6 0 00-6 6v3l-1.5 2.5A.5.5 0 003 14.5h14a.5.5 0 00.5-.5L16 11V8a6 6 0 00-6-6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M8 15.5a2 2 0 004 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span v-if="lowStockItems.length > 0" class="badge-count">{{ lowStockItems.length }}</span>
    </button>

    <div v-if="isOpen" class="alerts-dropdown" @click.stop>
      <div class="dropdown-header">
        <span class="dropdown-title">{{ t('alerts.title') }}</span>
        <span v-if="lowStockItems.length > 0" class="dropdown-count">
          {{ t('alerts.itemsBelowReorder', { count: lowStockItems.length }) }}
        </span>
      </div>

      <div v-if="lowStockItems.length === 0" class="alerts-empty">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="check-icon">
          <circle cx="8" cy="8" r="7" stroke="#059669" stroke-width="1.5"/>
          <path d="M4.5 8L7 10.5L11.5 5.5" stroke="#059669" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ t('alerts.empty') }}
      </div>

      <div v-else class="alerts-list">
        <div
          v-for="item in lowStockItems"
          :key="item.sku"
          class="alert-row"
          @click="navigateToInventory"
        >
          <div class="alert-info">
            <span class="alert-name">{{ item.name }}</span>
            <span class="alert-sku">{{ item.sku }}</span>
          </div>
          <div class="alert-qty">
            <span class="qty-current">{{ item.quantity_on_hand }}</span>
            <span class="qty-separator">/</span>
            <span class="qty-reorder">{{ item.reorder_point }}</span>
          </div>
        </div>
      </div>

      <div class="dropdown-footer">
        <button class="view-all-link" @click="navigateToInventory">
          {{ t('alerts.viewAll') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import { useI18n } from '../composables/useI18n'

export default {
  name: 'LowStockAlerts',
  setup() {
    const { t } = useI18n()
    const router = useRouter()
    const isOpen = ref(false)
    const lowStockItems = ref([])

    const loadAlerts = async () => {
      try {
        // Fetch all inventory without page-level filters — alerts are global
        const items = await api.getInventory()
        lowStockItems.value = items.filter(item => item.quantity_on_hand <= item.reorder_point)
      } catch (err) {
        // Silently fail — alerts are non-critical
      }
    }

    const toggleDropdown = () => {
      isOpen.value = !isOpen.value
    }

    const navigateToInventory = () => {
      isOpen.value = false
      router.push('/inventory')
    }

    const handleOutsideClick = () => {
      if (isOpen.value) {
        isOpen.value = false
      }
    }

    onMounted(() => {
      loadAlerts()
      document.addEventListener('click', handleOutsideClick)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleOutsideClick)
    })

    return {
      t,
      isOpen,
      lowStockItems,
      toggleDropdown,
      navigateToInventory
    }
  }
}
</script>

<style scoped>
.alerts-wrapper {
  position: relative;
}

.alerts-button {
  position: relative;
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

.alerts-button:hover {
  background: var(--surface-alt);
  color: var(--text);
}

.bell-icon {
  flex-shrink: 0;
}

.badge-count {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: #dc2626;
  color: #fff;
  font-size: 0.688rem;
  font-weight: 700;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.alerts-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 360px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--border);
}

.dropdown-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text);
}

.dropdown-count {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
}

.alerts-empty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.check-icon {
  flex-shrink: 0;
}

.alerts-list {
  max-height: 320px;
  overflow-y: auto;
}

.alert-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s ease;
}

.alert-row:last-child {
  border-bottom: none;
}

.alert-row:hover {
  background: var(--surface-alt);
}

.alert-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.alert-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alert-sku {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: monospace;
}

.alert-qty {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  flex-shrink: 0;
  margin-left: 1rem;
}

.qty-current {
  font-weight: 700;
  color: #dc2626;
}

.qty-separator {
  color: var(--text-muted);
}

.qty-reorder {
  color: var(--text-muted);
}

.dropdown-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border);
}

.view-all-link {
  display: block;
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--accent);
  cursor: pointer;
  text-align: left;
  transition: opacity 0.15s;
}

.view-all-link:hover {
  opacity: 0.8;
}
</style>
