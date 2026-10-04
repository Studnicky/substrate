<script setup lang="ts">
import { ref } from 'vue';
import { DrillDown } from '@studnicky/drilldown/browser';
import type { GroupNodeInterface } from '@studnicky/drilldown/interfaces';
import DrilldownTreeNode from './DrilldownTreeNode.vue';

const RECORD_COUNT = 320;
const BRANDS = ['Acme Outfitters', 'Apex Electronics', 'Beacon Home', 'Cedar & Co.', 'Harbor Supply', 'Juniper Apparel', 'Northstar Goods', 'Summit Outdoor'];
const REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Latin America'];
const CATEGORIES = ['Electronics', 'Home Goods', 'Apparel', 'Outdoors'];
const STATUSES = ['fulfilled', 'processing', 'returned', 'cancelled'];

interface OrderRecord {
  'brand': string
  'category': string
  'orderId': string
  'region': string
  'status': string
  'total': number
}

function generateOrders(count: number): OrderRecord[] {
  return Array.from({ length: count }, (_, index): OrderRecord => ({
    brand: BRANDS[index % BRANDS.length],
    category: CATEGORIES[Math.floor(index / REGIONS.length) % CATEGORIES.length],
    orderId: `ORD-${String(index + 1).padStart(4, '0')}`,
    region: REGIONS[index % REGIONS.length],
    status: STATUSES[Math.floor(index / (REGIONS.length * CATEGORIES.length)) % STATUSES.length],
    total: Number((12 + ((index * 37) % 839) + ((index * 13) % 100) / 100).toFixed(2))
  }));
}

const orders = ref<OrderRecord[]>([]);
const tree = ref<GroupNodeInterface | null>(null);
const generating = ref(false);

function generateAndDrillDown(): void {
  generating.value = true;

  try {
    const records = generateOrders(RECORD_COUNT);
    orders.value = records;

    const drillDown = new DrillDown();
    tree.value = drillDown.group(records, {
      'maximumDepth': 4,
      'minimumGroupSize': 1,
      'propertyPriority': ['region', 'category', 'status', 'brand']
    });
  } finally {
    generating.value = false;
  }
}

generateAndDrillDown();
</script>

<template>
  <div class="drilldown-demo">
    <div class="drilldown-demo__header">
      <div class="drilldown-demo__summary">
        {{ orders.length }} synthetic orders, drilled down by <code>region → category → status → brand</code>
      </div>
      <button type="button" class="drilldown-demo__regenerate" :disabled="generating" @click="generateAndDrillDown">
        {{ generating ? 'Generating…' : '↻ Regenerate dataset' }}
      </button>
    </div>

    <ul v-if="tree" class="drilldown-demo__tree">
      <DrilldownTreeNode :node="tree" :depth="0" />
    </ul>
  </div>
</template>

<style scoped>
.drilldown-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  margin: 1rem 0 1.5rem;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}

.drilldown-demo__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.85rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.drilldown-demo__summary {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
}
.drilldown-demo__summary code {
  font-size: 0.78rem;
}

.drilldown-demo__regenerate {
  background: var(--vp-c-brand-1);
  color: #fff;
  border: none;
  padding: 0.3rem 0.85rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  white-space: nowrap;
  flex: 0 0 auto;
}
.drilldown-demo__regenerate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.drilldown-demo__tree {
  margin: 0;
  padding: 0.6rem 0.85rem;
  background: var(--vp-c-bg);
  max-height: 28rem;
  overflow: auto;
}
</style>
