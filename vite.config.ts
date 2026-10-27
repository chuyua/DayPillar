import {defineConfig} from 'vite';

// GitHub Pages project path and Cloudflare Pages root use the same build.
export default defineConfig({base: process.env.BASE_PATH || '/'});
