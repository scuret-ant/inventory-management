<template>
  <div class="orders">
    <div class="page-header">
      <h2>{{ t('orders.title') }}</h2>
      <p>{{ t('orders.description') }}</p>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div class="stats-grid">
        <div class="stat-card success">
          <div class="stat-label">{{ t('status.delivered') }}</div>
          <div class="stat-value">{{ getOrdersByStatus('Delivered').length }}</div>
        </div>
        <div class="stat-card info">
          <div class="stat-label">{{ t('status.shipped') }}</div>
          <div class="stat-value">{{ getOrdersByStatus('Shipped').length }}</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">{{ t('status.processing') }}</div>
          <div class="stat-value">{{ getOrdersByStatus('Processing').length }}</div>
        </div>
        <div class="stat-card danger">
          <div class="stat-label">{{ t('status.backordered') }}</div>
          <div class="stat-value">{{ getOrdersByStatus('Backordered').length }}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('orders.submittedOrders') }} ({{ submittedOrders.length }})</h3>
        </div>
        <div class="table-container">
          <table class="orders-table" v-if="submittedOrders.length > 0">
            <thead>
              <tr>
                <th class="col-order-number">{{ t('orders.table.orderNumber') }}</th>
                <th class="col-date">{{ t('orders.table.submissionDate') }}</th>
                <th class="col-date">{{ t('orders.table.expectedDelivery') }}</th>
                <th>{{ t('orders.table.itemCount') }}</th>
                <th class="col-value">{{ t('orders.table.totalValue') }}</th>
                <th class="col-status">{{ t('orders.table.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sub in submittedOrders" :key="sub.id">
                <td class="col-order-number"><strong>{{ sub.order_number }}</strong></td>
                <td class="col-date">{{ formatDate(sub.submission_date) }}</td>
                <td class="col-date">{{ formatDate(sub.expected_delivery) }}</td>
                <td>{{ sub.item_count }}</td>
                <td class="col-value"><strong>{{ currencySymbol }}{{ sub.total_value.toLocaleString() }}</strong></td>
                <td class="col-status">
                  <span :class="['badge', getOrderStatusClass(sub.status)]">
                    {{ t(`status.${sub.status.toLowerCase()}`) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="no-data">{{ t('orders.noSubmittedOrders') }}</p>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('orders.allOrders') }} ({{ filteredOrders.length }})</h3>
          <div class="card-actions">
            <div class="search-box">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="t('orders.searchPlaceholder')"
                class="search-input"
              />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                class="clear-search"
                :title="t('orders.clearSearch')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
            <button class="export-btn" @click="handleExport">{{ t('common.exportCsv') }}</button>
          </div>
        </div>
        <div class="table-container">
          <p v-if="filteredOrders.length === 0 && searchQuery" class="no-data">{{ t('common.noResults') }}</p>
          <table v-else class="orders-table">
            <thead>
              <tr>
                <th class="col-order-number">{{ t('orders.table.orderNumber') }}</th>
                <th class="col-customer">{{ t('orders.table.customer') }}</th>
                <th class="col-items">{{ t('orders.table.items') }}</th>
                <th class="col-status">{{ t('orders.table.status') }}</th>
                <th class="col-date">{{ t('orders.table.orderDate') }}</th>
                <th class="col-date">{{ t('orders.table.expectedDelivery') }}</th>
                <th class="col-value">{{ t('orders.table.totalValue') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in filteredOrders" :key="order.id">
                <td class="col-order-number"><strong>{{ order.order_number }}</strong></td>
                <td class="col-customer">{{ translateCustomerName(order.customer) }}</td>
                <td class="col-items">
                  <details class="items-details">
                    <summary class="items-summary">
                      {{ t('orders.itemsCount', { count: order.items.length }) }}
                    </summary>
                    <div class="items-dropdown">
                      <div v-for="(item, idx) in order.items" :key="idx" class="item-entry">
                        <span class="item-name">{{ translateProductName(item.name) }}</span>
                        <span class="item-meta">{{ t('orders.quantity') }}: {{ item.quantity }} @ {{ currencySymbol }}{{ item.unit_price }}</span>
                      </div>
                    </div>
                  </details>
                </td>
                <td class="col-status">
                  <span :class="['badge', getOrderStatusClass(order.status)]">
                    {{ t(`status.${order.status.toLowerCase()}`) }}
                  </span>
                </td>
                <td class="col-date">{{ formatDate(order.order_date) }}</td>
                <td class="col-date">{{ formatDate(order.expected_delivery) }}</td>
                <td class="col-value"><strong>{{ currencySymbol }}{{ order.total_value.toLocaleString() }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, computed } from 'vue'
import { api } from '../api'
import { useFilters } from '../composables/useFilters'
import { useI18n } from '../composables/useI18n'
import { exportToCsv } from '../utils/csv'

export default {
  name: 'Orders',
  setup() {
    const { t, currentCurrency, translateProductName, translateCustomerName } = useI18n()

    const currencySymbol = computed(() => {
      return currentCurrency.value === 'JPY' ? '¥' : '$'
    })
    const loading = ref(true)
    const error = ref(null)
    const orders = ref([])
    const submittedOrders = ref([])
    const searchQuery = ref('')

    // Filter All Orders by order number, customer, or any item SKU
    const filteredOrders = computed(() => {
      const q = searchQuery.value.trim().toLowerCase()
      if (!q) return orders.value
      return orders.value.filter(order =>
        order.order_number.toLowerCase().includes(q) ||
        order.customer.toLowerCase().includes(q) ||
        order.items.some(item => item.sku.toLowerCase().includes(q))
      )
    })

    // Use shared filters
    const {
      selectedPeriod,
      selectedLocation,
      selectedCategory,
      selectedStatus,
      getCurrentFilters
    } = useFilters()

    const loadOrders = async () => {
      try {
        const filters = getCurrentFilters()
        const fetchedOrders = await api.getOrders(filters)

        // Sort orders by order_date (earliest first)
        orders.value = fetchedOrders.sort((a, b) => {
          const dateA = new Date(a.order_date)
          const dateB = new Date(b.order_date)
          return dateA - dateB
        })
      } catch (err) {
        error.value = 'Failed to load orders: ' + err.message
      }
    }

    const loadSubmittedOrders = async () => {
      try {
        submittedOrders.value = await api.getRestockingOrders()
      } catch (err) {
        error.value = 'Failed to load submitted orders: ' + err.message
      }
    }

    const loadAll = async () => {
      loading.value = true
      error.value = null
      await Promise.all([loadOrders(), loadSubmittedOrders()])
      loading.value = false
    }

    // Watch for filter changes and reload data
    watch([selectedPeriod, selectedLocation, selectedCategory, selectedStatus], () => {
      loadAll()
    })

    const getOrdersByStatus = (status) => {
      return orders.value.filter(order => order.status === status)
    }

    const getOrderStatusClass = (status) => {
      const statusMap = {
        'Delivered': 'success',
        'Shipped': 'info',
        'Processing': 'warning',
        'Backordered': 'danger'
      }
      return statusMap[status] || 'info'
    }

    const formatDate = (dateString) => {
      const { currentLocale } = useI18n()
      const locale = currentLocale.value === 'ja' ? 'ja-JP' : 'en-US'
      return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    const handleExport = () => {
      exportToCsv(
        `orders-${new Date().toISOString().slice(0, 10)}.csv`,
        filteredOrders.value,
        [
          { key: 'order_number', label: t('orders.table.orderNumber') },
          { key: 'customer', label: t('orders.table.customer'), format: r => translateCustomerName(r.customer) },
          { key: 'status', label: t('orders.table.status'), format: r => t(`status.${r.status.toLowerCase()}`) },
          { key: 'order_date', label: t('orders.table.orderDate'), format: r => formatDate(r.order_date) },
          { key: 'expected_delivery', label: t('orders.table.expectedDelivery'), format: r => formatDate(r.expected_delivery) },
          { key: 'total_value', label: t('orders.table.totalValue') },
          { key: 'items', label: t('orders.table.items'), format: r => r.items.map(i => `${i.sku} x ${i.quantity}`).join('; ') }
        ]
      )
    }

    onMounted(loadAll)

    return {
      t,
      loading,
      error,
      orders,
      submittedOrders,
      searchQuery,
      filteredOrders,
      getOrdersByStatus,
      getOrderStatusClass,
      formatDate,
      currencySymbol,
      translateProductName,
      translateCustomerName,
      handleExport
    }
  }
}
</script>

<style scoped>
/* Fixed table layout to prevent column shifting */
.orders-table {
  table-layout: fixed;
  width: 100%;
}

/* Column widths */
.col-order-number {
  width: 130px;
}

.col-customer {
  width: 180px;
}

.col-items {
  width: 200px;
}

.col-status {
  width: 130px;
}

.col-date {
  width: 140px;
}

.col-value {
  width: 120px;
}

/* Items details styling */
.items-details {
  position: relative;
}

.items-summary {
  cursor: pointer;
  color: #3b82f6;
  font-weight: 500;
  list-style: none;
  user-select: none;
  display: inline-block;
}

.items-summary::-webkit-details-marker {
  display: none;
}

.items-summary::before {
  content: '▶';
  display: inline-block;
  margin-right: 0.375rem;
  font-size: 0.75rem;
  transition: transform 0.2s;
}

.items-details[open] .items-summary::before {
  transform: rotate(90deg);
}

.items-summary:hover {
  color: #2563eb;
  text-decoration: underline;
}

/* Dropdown container */
.items-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 0.75rem;
  z-index: 10;
  min-width: 300px;
  max-width: 400px;
}

.item-entry {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.item-entry:last-child {
  border-bottom: none;
}

.item-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #0f172a;
}

.item-meta {
  font-size: 0.813rem;
  color: #64748b;
}

.no-data {
  padding: 1.5rem;
  color: #64748b;
  text-align: center;
}

/* Card header actions: search + export sit side by side */
.card-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 280px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  width: 18px;
  height: 18px;
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.5rem 2.5rem 0.5rem 2.5rem;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  font-size: 0.875rem;
  color: var(--text);
  background: var(--surface-alt);
  font-family: inherit;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: var(--surface);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: #94a3b8;
}

.clear-search {
  position: absolute;
  right: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-search:hover {
  background: var(--surface-alt);
  color: var(--text-muted);
}

.clear-search svg {
  width: 18px;
  height: 18px;
}

.export-btn {
  padding: 0.5rem 1rem;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-body);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.export-btn:hover {
  background: var(--surface-alt);
  border-color: var(--text-muted);
}
</style>
