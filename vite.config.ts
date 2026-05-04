import react from "@vitejs/plugin-react-swc"
import fs from "fs"
import path from "path"
import { defineConfig } from "vite"

process.env.BROWSERSLIST_IGNORE_OLD_DATA = "1"

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const certDir = path.resolve(__dirname, "./.cert")
  const keyPath = path.join(certDir, "key.pem")
  const certPath = path.join(certDir, "cert.pem")
  const https =
    command === "serve" && fs.existsSync(keyPath) && fs.existsSync(certPath)
      ? {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        }
      : undefined

  return {
    base: "/",
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      https,
      proxy: {
        "/api/v1/ws/server": {
          target: "ws://localhost:8008",
          changeOrigin: true,
          ws: true,
        },
        "/api/v1/": {
          target: "http://localhost:8008",
          changeOrigin: true,
        },
      },
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
    build: {
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name].[hash].js`,
          chunkFileNames: `assets/[name].[hash].js`,
          assetFileNames: `assets/[name].[hash].[ext]`,
          manualChunks(id) {
            if (id.includes("commonjsHelpers")) return "react"
            if (!id.includes("node_modules")) return
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react"
            if (/[\\/]node_modules[\\/]@tanstack[\\/]/.test(id)) return "tanstack"
            if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return "motion"
            if (/[\\/]node_modules[\\/](i18next|react-i18next)[\\/]/.test(id)) return "i18n"
          },
        },
      },
      chunkSizeWarningLimit: 1500,
    },
  }
})
