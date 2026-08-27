<script setup lang="ts">
import { ref } from 'vue';

interface GroupNodeLike {
  'grouped': GroupNodeLike[] | null
  'property': string | null
  'ungrouped': unknown[] | null
  'value': unknown
}

const props = defineProps<{ node: GroupNodeLike; depth: number }>();

const expanded = ref(props.depth < 1);

function toggle(): void {
  expanded.value = !expanded.value;
}

function formatValue(value: unknown): string {
  if (value === null) {
    return 'All records';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value !== 'object') {
    return String(value);
  }

  const record = value as Record<string, unknown>;

  if ('cidr' in record) {
    return String(record.cidr);
  }
  if ('semver' in record) {
    return String(record.semver);
  }
  if ('sequential' in record) {
    const sequential = record.sequential as Record<string, unknown>;
    return `${String(sequential.prefix ?? '')}#${String(sequential.padding ?? '')}${String(sequential.suffix ?? '')}`;
  }
  if ('outlier' in record) {
    return 'Outliers';
  }
  if ('start' in record && 'end' in record) {
    return `${String(record.start)} – ${String(record.end)}`;
  }
  if ('minimum' in record && 'maximum' in record) {
    return `${String(record.minimum)} – ${String(record.maximum)}`;
  }

  return JSON.stringify(value);
}

function recordCount(node: GroupNodeLike): number {
  if (node.ungrouped !== null) {
    return node.ungrouped.length;
  }
  if (node.grouped !== null) {
    return node.grouped.reduce((sum, child) => { return sum + recordCount(child); }, 0);
  }
  return 0;
}
</script>

<template>
  <li class="tree-node">
    <div
      class="tree-node__row"
      :class="{ 'tree-node__row--leaf': node.grouped === null }"
      @click="node.grouped !== null && toggle()"
    >
      <span v-if="node.grouped !== null" class="tree-node__caret" :class="{ 'tree-node__caret--open': expanded }">▶</span>
      <span v-else class="tree-node__caret tree-node__caret--spacer" />
      <span v-if="node.property !== null" class="tree-node__property">{{ node.property }}:</span>
      <span class="tree-node__value">{{ formatValue(node.value) }}</span>
      <span class="tree-node__count">{{ recordCount(node) }} record{{ recordCount(node) === 1 ? '' : 's' }}</span>
    </div>

    <ul v-if="node.grouped !== null && expanded" class="tree-node__children">
      <DrilldownTreeNode v-for="(child, index) in node.grouped" :key="index" :node="child" :depth="depth + 1" />
    </ul>
  </li>
</template>

<style scoped>
.tree-node {
  list-style: none;
}

.tree-node__row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.4rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}
.tree-node__row:hover {
  background: var(--vp-c-bg-soft);
}
.tree-node__row--leaf {
  cursor: default;
}
.tree-node__row--leaf:hover {
  background: transparent;
}

.tree-node__caret {
  display: inline-block;
  width: 0.9rem;
  flex: 0 0 auto;
  color: var(--vp-c-text-3, var(--vp-c-text-2));
  transition: transform 0.12s ease;
  font-size: 0.65rem;
}
.tree-node__caret--open {
  transform: rotate(90deg);
}
.tree-node__caret--spacer {
  visibility: hidden;
}

.tree-node__property {
  color: var(--vp-c-text-3, var(--vp-c-text-2));
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
}

.tree-node__value {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.tree-node__count {
  margin-left: auto;
  color: var(--vp-c-text-3, var(--vp-c-text-2));
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tree-node__children {
  margin: 0;
  padding-left: 1.3rem;
  border-left: 1px solid var(--vp-c-divider);
}
</style>
