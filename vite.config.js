import { defineConfig } from 'vite';

// base './' makes every asset URL relative, so the site works at
// https://<user>.github.io/<repo>/ regardless of the repo name
export default defineConfig({
  base: './',
});
