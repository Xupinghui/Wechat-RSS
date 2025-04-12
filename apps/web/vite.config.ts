import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const projectRootDir = resolve(__dirname);

const isProd = process.env.NODE_ENV === 'production';
const skipTsCheck = process.env.SKIP_TS_CHECK === 'true';

console.log('process.env.NODE_ENV: ', process.env.NODE_ENV);
console.log('SKIP_TS_CHECK: ', skipTsCheck);

const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, './package.json'), 'utf-8'),
);

// https://vitejs.dev/config/
export default defineConfig({
  base: '/dash',
  server: {
    allowedHosts: ['.ngrok-free.app'],
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [
    react(),
    !isProd
      ? null
      : {
          name: 'renameIndex',
          enforce: 'post',
          generateBundle(options, bundle) {
            const indexHtml = bundle['index.html'];
            indexHtml.fileName = 'index.hbs';
          },
        },
    {
      name: 'vite-plugin-disable-ts-check',
      enforce: 'pre',
      transform(code, id) {
        if (skipTsCheck && /\.tsx?$/.test(id)) {
          return {
            code: `// @ts-nocheck\n${code}`,
            map: null
          };
        }
      }
    }
  ],
  resolve: {
    alias: [
      {
        find: '@server',
        replacement: resolve(projectRootDir, '../apps/server/src'),
      },
      {
        find: '@web',
        replacement: resolve(projectRootDir, './src'),
      },
    ],
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(projectRootDir, '..', 'server', 'client'),
    minify: isProd ? 'esbuild' : false,
    sourcemap: !isProd,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'TYPE_ERROR' || 
            warning.code === 'SYNTAX_ERROR' || 
            warning.message?.includes('TypeScript')) {
          return;
        }
        warn(warning);
      }
    }
  },
  esbuild: {
    legalComments: 'none',
    treeShaking: true,
    jsx: 'automatic'
  }
});
