import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const codespaceName = process.env.CODESPACE_NAME;
const srcPath = fileURLToPath(new URL('./src', import.meta.url));
const aceMockPath = fileURLToPath(
  new URL('./src/__mocks__/ace.js', import.meta.url)
);

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: [
      { find: 'src', replacement: srcPath },
      ...(mode === 'test'
        ? [{ find: /^ace-builds(?:\/.*)?$/, replacement: aceMockPath }]
        : [
            {
              find: 'ace-builds/webpack-resolver',
              replacement: 'ace-builds/src-noconflict/mode-python',
            },
          ]),
    ],
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js/,
    exclude: [],
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    ...(codespaceName
      ? { allowedHosts: [`${codespaceName}-3000.app.github.dev`] }
      : {}),
  },
  build: {
    outDir: process.env.BUILD_PATH || 'build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/');

          if (normalizedId.includes('/node_modules/@amcharts/amcharts5/')) {
            return normalizedId.includes('/.internal/charts/map/') ||
              normalizedId.endsWith('/amcharts5/map.js')
              ? 'amcharts-map'
              : 'amcharts-core';
          }

          if (
            normalizedId.includes(
              '/node_modules/ace-builds/src-noconflict/ext-language_tools'
            )
          ) {
            return 'ace-language-tools';
          }

          if (
            /\/node_modules\/(react|react-dom|scheduler)\//.test(normalizedId)
          ) {
            return 'react-vendor';
          }

          return undefined;
        },
      },
    },
  },
  test: {
    clearMocks: true,
    coverage: {
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/**/*.test.js',
        'src/**/__tests__/**',
        'src/**/__mocks__/**',
        'src/setupTests.js',
      ],
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
    },
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.js'],
  },
}));
