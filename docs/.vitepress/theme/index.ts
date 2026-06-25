import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import PackageGrid from './PackageGrid.vue';
import RunnableExample from './components/RunnableExample.vue';
import './palette.css';
import './base.css';

// The sidebar header logo is injected into the default layout's
// `sidebar-nav-before` slot and rendered as a CSS block in base.css.
// The home-page package grid is a real component (not frontmatter features),
// so its inline-SVG icons render identically on the server and the client.
export const theme: Theme = {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'sidebar-nav-before': () => h('div', { class: 'substrate-sidebar-logo', 'aria-hidden': 'true' }),
    });
  },
  enhanceApp({ app }) {
    app.component('PackageGrid', PackageGrid);
    app.component('RunnableExample', RunnableExample);
  },
};
export default theme;
