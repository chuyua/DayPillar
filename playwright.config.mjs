import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    // GitHub Ubuntu 24.04 Runner 预装 Google Chrome，避免重复下载。
    channel: 'chrome',
    viewport: {width: 1366, height: 900},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/DayPillar/',
    // 与 Github Pages 产物保持同一个 base；缺少此值会使预览服务资产路径变成 /。
    env: {BASE_PATH: '/DayPillar/'},
    reuseExistingServer: false,
    timeout: 30_000
  }
});
