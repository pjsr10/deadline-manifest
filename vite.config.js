import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves a project site at username.github.io/repo-name/,
  // so the app needs to know it's not living at the domain root.
  // Change this to match your repo's exact name (with slashes either side).
  base: "/deadline-manifest/",
})
