import react from "@vitejs/plugin-react-swc"
import fs from "fs"
import path from "path"
import { defineConfig } from "vite"

process.env.BROWSERSLIST_IGNORE_OLD_DATA = "1"

function normalizeProductionBase(value: string | undefined) {
  const base = value?.trim()
  if (!base || base === "." || base === "./" || base === "/") return "/"
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(base)) return base.endsWith("/") ? base : `${base}/`
  return `/${base.replace(/^\/+|\/+$/g, "")}/`
}

function preferWoff2FontLogos() {
  const source =
    'src:url("font-logos.woff?v=1.2.0") format("woff"),url("font-logos.woff2?v=1.2.0") format("woff2"),url("font-logos.ttf?v=1.2.0") format("truetype")'

  return {
    name: "prefer-woff2-font-logos",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      const normalizedId = id.split("?", 1)[0].replace(/\\/g, "/")
      if (!normalizedId.endsWith("/font-logos/assets/font-logos.css")) return null

      return code.replace("font-display: auto", "font-display: swap").replace(source, 'src:url("font-logos.woff2?v=1.2.0") format("woff2")')
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const productionBase = normalizeProductionBase(process.env.VITE_BASE_PATH)
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
    base: command === "build" ? productionBase : "/",
    plugins: [preferWoff2FontLogos(), react()],
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
      assetsInlineLimit: 0,
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
            if (/[\\/]node_modules[\\/]@radix-ui[\\/]/.test(id)) return "radix"
            if (/[\\/]node_modules[\\/](i18next|react-i18next)[\\/]/.test(id)) return "i18n"
          },
        },
      },
      chunkSizeWarningLimit: 1500,
    },
  }
})
