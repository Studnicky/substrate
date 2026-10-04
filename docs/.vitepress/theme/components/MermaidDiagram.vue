<script setup lang="ts">
interface MermaidDiagramProps {
  readonly alt: string;
  readonly class?: string;
  readonly darkSrc: string;
  readonly lightSrc: string;
}

const props = withDefaults(defineProps<MermaidDiagramProps>(), {
  class: 'substrate-diagram'
});
</script>

<template>
  <figure :class="props.class">
    <img :alt="props.alt" class="substrate-diagram__light" :src="props.lightSrc">
    <img alt="" aria-hidden="true" class="substrate-diagram__dark" :src="props.darkSrc">
  </figure>
</template>
