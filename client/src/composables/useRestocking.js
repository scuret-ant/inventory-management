import { ref, computed } from 'vue'

// Module-level singleton state so the in-progress restocking cart survives
// navigation away from /restocking and back, mirroring useFilters.
const budget = ref(50000)
const selectedRows = ref([])

export function useRestocking() {
  const total = computed(() =>
    selectedRows.value.reduce((sum, row) => sum + row.quantity * row.unit_cost, 0)
  )

  const remaining = computed(() => budget.value - total.value)

  const isOverBudget = computed(() => total.value > budget.value)

  const canPlaceOrder = computed(
    () => selectedRows.value.length > 0 && !isOverBudget.value
  )

  const clearCart = () => {
    selectedRows.value = []
  }

  const removeRow = (sku) => {
    selectedRows.value = selectedRows.value.filter((row) => row.sku !== sku)
  }

  return {
    budget,
    selectedRows,
    total,
    remaining,
    isOverBudget,
    canPlaceOrder,
    clearCart,
    removeRow
  }
}
