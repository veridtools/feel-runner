import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import FeelPlayground from './FeelPlayground.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('FeelPlayground', FeelPlayground);
  },
} satisfies Theme;
