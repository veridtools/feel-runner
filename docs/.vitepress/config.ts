import { defineConfig } from 'vitepress';

const base = '/feel-runner/';

export default defineConfig({
  base,
  title: 'Verd',
  titleTemplate: ':title | feel-runner',
  description: 'FEEL expression evaluator for DMN 1.5 — zero dependencies, ≥97% conformance',
  lang: 'en-US',
  ignoreDeadLinks: true,
  head: [['link', { rel: 'icon', type: 'image/webp', href: `${base}verid-logo.webp` }]],

  themeConfig: {
    logo: '/verid-logo.webp',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/reference' },
      { text: 'Playground', link: '/playground' },
    ],

    search: {
      provider: 'local',
    },

    sidebar: [
      {
        text: 'Playground',
        items: [{ text: 'Try it live', link: '/playground' }],
      },
      {
        text: 'Getting Started',
        items: [
          { text: 'Overview', link: '/guide/getting-started' },
          { text: 'Installation', link: '/guide/getting-started#install' },
          { text: 'Quickstart', link: '/guide/getting-started#quickstart' },
        ],
      },
      {
        text: 'Guide',
        items: [
          { text: 'Expressions', link: '/guide/expressions' },
          { text: 'Unary Tests', link: '/guide/unary-tests' },
          { text: 'Types', link: '/guide/types' },
          { text: 'Builtins', link: '/guide/builtins' },
          { text: 'Temporal', link: '/guide/temporal' },
          { text: 'Context & Variables', link: '/guide/context' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'evaluate()', link: '/api/reference#evaluate' },
          { text: 'unaryTest()', link: '/api/reference#unarytest' },
          { text: 'EvaluationResult', link: '/api/reference#evaluationresult' },
          { text: 'FeelValue', link: '/api/reference#feelvalue' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/veridtools/feel-runner' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Veridtools',
    },

    editLink: {
      pattern: 'https://github.com/veridtools/feel-runner/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    },
  },

  markdown: {
    lineNumbers: true,
  },
});
