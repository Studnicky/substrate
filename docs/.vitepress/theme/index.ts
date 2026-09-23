import './env.d.ts';

import type { Theme } from 'vitepress';

import DefaultTheme from 'vitepress/theme';
import {
  defineAsyncComponent, h
} from 'vue';

import RunnableExample from './components/RunnableExample.vue';
import PackageGrid from './PackageGrid.vue';
import './palette.css';
import './base.css';

const DrilldownTreeDemo = defineAsyncComponent(async () => {
  return await import('./components/DrilldownTreeDemo.vue');
});

// The sidebar header logo is injected into the default layout's
// `sidebar-nav-before` slot and rendered as a CSS block in base.css.
// The home-page package grid is a real component (not frontmatter features),
// so its inline-SVG icons render identically on the server and the client.
export const theme: Theme = {
  'enhanceApp': function({ app }) {
    app.component('PackageGrid', PackageGrid);
    app.component('RunnableExample', RunnableExample);
    app.component('DrilldownTreeDemo', DrilldownTreeDemo);
  },
  'extends': DefaultTheme,
  'Layout': function() {
    return h(DefaultTheme.Layout, null, {
      'sidebar-nav-before': () => {return h('div', { 'aria-hidden': 'true', 'class': 'substrate-sidebar-logo' });}
    });
  }
};
export default theme;
