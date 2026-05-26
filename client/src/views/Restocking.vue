<template>
  <div class="restocking">
    <div class="page-header">
      <h2>{{ t('restocking.title') }}</h2>
      <p>{{ t('restocking.description') }}</p>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <!-- Budget slider -->
      <div class="card budget-card">
        <div class="card-header">
          <h3 class="card-title">{{ t('restocking.budget') }}</h3>
        </div>
        <div class="budget-slider-row">
          <input
            type="range"
            min="0"
            max="100000"
            step="1000"
            v-model.number="budget"
            class="budget-range"
          />
          <span class="budget-value">{{ currencySymbol }}{{ budget.toLocaleString() }}</span>
        </div>
      </div>

      <!-- Recommendations card -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('restocking.recommendations') }}</h3>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>{{ t('restocking.table.sku') }}</th>
                <th>{{ t('restocking.table.itemName') }}</th>
                <th>{{ t('restocking.table.forecastedDemand') }}</th>
                <th>{{ t('restocking.table.onHand') }}</th>
                <th>{{ t('restocking.table.unitCost') }}</th>
                <th>{{ t('restocking.table.recommendedQty') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rec in recommendations" :key="rec.sku">
                <td><strong>{{ rec.sku }}</strong></td>
                <td>{{ rec.name }}</td>
                <td>{{ rec.forecasted_demand }}</td>
                <td>{{ rec.quantity_on_hand }}</td>
                <td>{{ currencySymbol }}{{ rec.unit_cost.toLocaleString() }}</td>
                <td>{{ rec.recommended_qty }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Selected Items card -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('restocking.selectedItems') }}</h3>
        </div>

        <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
        <div v-if="orderError" class="error">{{ orderError }}</div>

        <div v-if="selectedRows.length === 0" class="empty-state">
          {{ t('restocking.noRecommendations') }}
        </div>
        <div v-else>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>{{ t('restocking.table.sku') }}</th>
                  <th>{{ t('restocking.table.itemName') }}</th>
                  <th>{{ t('restocking.table.unitCost') }}</th>
                  <th>{{ t('restocking.table.quantity') }}</th>
                  <th>{{ t('restocking.table.lineTotal') }}</th>
                  <th>{{ t('restocking.table.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in selectedRows" :key="row.sku">
                  <td><strong>{{ row.sku }}</strong></td>
                  <td>{{ row.name }}</td>
                  <td>{{ currencySymbol }}{{ row.unit_cost.toLocaleString() }}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      v-model.number="row.quantity"
                      class="qty-input"
                    />
                  </td>
                  <td>{{ currencySymbol }}{{ (row.quantity * row.unit_cost).toLocaleString() }}</td>
                  <td>
                    <button class="btn-remove" @click="removeRow(row.sku)">
                      {{ t('restocking.remove') }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="cart-footer">
            <div class="cart-totals">
              <span class="total-label">{{ t('restocking.runningTotal') }}:</span>
              <span class="total-value" :class="{ 'over-budget': isOverBudget }">
                {{ currencySymbol }}{{ total.toLocaleString() }}
              </span>
              <span class="separator">|</span>
              <span class="remaining-label">{{ t('restocking.budgetRemaining') }}:</span>
              <span class="remaining-value" :class="{ 'over-budget': isOverBudget }">
                {{ currencySymbol }}{{ remaining.toLocaleString() }}
              </span>
            </div>
            <div class="cart-actions">
              <span v-if="isOverBudget" class="budget-exceeded-warning">
                {{ t('restocking.budgetExceeded') }}
              </span>
              <button
                class="btn-place-order"
                :disabled="!canPlaceOrder || placingOrder"
                @click="placeOrder"
              >
                {{ t('restocking.placeOrder') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '../api'
import { useI18n } from '../composables/useI18n'
import { useRestocking } from '../composables/useRestocking'

export default {
  name: 'Restocking',
  setup() {
    const { t, currentCurrency } = useI18n()
    const { budget, selectedRows, total, remaining, isOverBudget, canPlaceOrder, clearCart, removeRow } = useRestocking()

    const currencySymbol = computed(() => currentCurrency.value === 'JPY' ? '¥' : '$')

    const loading = ref(true)
    const error = ref(null)
    const orderError = ref(null)
    const successMessage = ref(null)
    const placingOrder = ref(false)

    // Raw joined recommendation data; greedy fill reads from this.
    const recommendations = ref([])

    const loadData = async () => {
      loading.value = true
      error.value = null
      try {
        const [forecasts, inventory] = await Promise.all([
          api.getDemandForecasts(),
          api.getInventory()
        ])

        // Build a lookup map by SKU for O(1) joins.
        const inventoryBySku = new Map(inventory.map(item => [item.sku, item]))

        const joined = []
        for (const forecast of forecasts) {
          const inv = inventoryBySku.get(forecast.item_sku)
          // Skip forecasts with no matching inventory — known data mismatches exist.
          if (!inv) continue

          const forecasted_demand = forecast.forecasted_demand
          const quantity_on_hand = inv.quantity_on_hand

          // Close the gap between forecast and current stock, but keep at least a
          // 25% buffer of forecast so high-demand items still get a meaningful
          // restock when already well-stocked. Floor of 1.
          const recommended_qty = Math.max(
            Math.max(forecasted_demand - quantity_on_hand, Math.ceil(forecasted_demand * 0.25)),
            1
          )

          joined.push({
            sku: inv.sku,
            name: inv.name,
            forecasted_demand,
            quantity_on_hand,
            unit_cost: inv.unit_cost,
            recommended_qty
          })
        }

        // Sort descending by forecasted demand so highest-priority items appear first.
        joined.sort((a, b) => b.forecasted_demand - a.forecasted_demand)
        recommendations.value = joined
      } catch (err) {
        error.value = t('common.error') + ': ' + err.message
      } finally {
        loading.value = false
      }
    }

    const runGreedyFill = () => {
      const cart = []
      let running_total = 0

      for (const rec of recommendations.value) {
        const line_cost = rec.recommended_qty * rec.unit_cost

        if (running_total + line_cost <= budget.value) {
          cart.push({
            sku: rec.sku,
            name: rec.name,
            quantity: rec.recommended_qty,
            unit_cost: rec.unit_cost,
            forecasted_demand: rec.forecasted_demand,
            quantity_on_hand: rec.quantity_on_hand
          })
          running_total += line_cost
        }
        // Skip (not break) — cheaper items further down the sorted list may still
        // fit even when this item's line cost would exceed remaining budget.
      }

      selectedRows.value = cart
    }

    // Re-run greedy fill whenever budget changes so the cart always reflects
    // what the current budget can afford.
    watch(budget, () => {
      runGreedyFill()
    })

    const placeOrder = async () => {
      placingOrder.value = true
      orderError.value = null
      try {
        await api.createRestockingOrder({
          items: selectedRows.value.map(r => ({
            sku: r.sku,
            name: r.name,
            quantity: r.quantity,
            unit_cost: r.unit_cost
          })),
          budget: budget.value
        })
        clearCart()
        successMessage.value = t('restocking.placedSuccess')
        setTimeout(() => {
          successMessage.value = null
        }, 4000)
      } catch (err) {
        orderError.value = t('restocking.placeFailed') + ': ' + err.message
      } finally {
        placingOrder.value = false
      }
    }

    onMounted(async () => {
      await loadData()
      runGreedyFill()
    })

    return {
      t,
      currencySymbol,
      loading,
      error,
      orderError,
      successMessage,
      placingOrder,
      recommendations,
      budget,
      selectedRows,
      total,
      remaining,
      isOverBudget,
      canPlaceOrder,
      removeRow,
      placeOrder
    }
  }
}
</script>

<style scoped>
/* Budget slider layout */
.budget-card {
  margin-bottom: 1.25rem;
}

.budget-slider-row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.budget-range {
  flex: 1;
  height: 6px;
  accent-color: #2563eb;
  cursor: pointer;
}

.budget-value {
  min-width: 110px;
  text-align: right;
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  flex-shrink: 0;
}

/* Editable quantity input */
.qty-input {
  width: 72px;
  padding: 0.3rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #0f172a;
  background: #f8fafc;
}

.qty-input:focus {
  outline: none;
  border-color: #2563eb;
  background: #fff;
}

/* Cart footer */
.cart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.cart-totals {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.9375rem;
  flex-wrap: wrap;
}

.total-label,
.remaining-label {
  color: #64748b;
  font-weight: 500;
}

.total-value,
.remaining-value {
  font-weight: 700;
  color: #0f172a;
}

.total-value.over-budget,
.remaining-value.over-budget {
  color: #dc2626;
}

.separator {
  color: #cbd5e1;
  padding: 0 0.25rem;
}

.cart-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.budget-exceeded-warning {
  font-size: 0.875rem;
  font-weight: 600;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 0.375rem 0.75rem;
}

/* Buttons */
.btn-place-order {
  padding: 0.625rem 1.5rem;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-place-order:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-place-order:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.btn-remove {
  padding: 0.375rem 0.875rem;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 6px;
  font-size: 0.813rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-remove:hover {
  background: #fee2e2;
}

/* Success message */
.success-message {
  background: #d1fae5;
  border: 1px solid #6ee7b7;
  color: #065f46;
  padding: 0.875rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 2.5rem;
  color: #64748b;
  font-size: 0.9375rem;
}
</style>
