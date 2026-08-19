import App from "@/App"
import { getApplicationBasename } from "@/lib/app-base"
import ErrorPage from "@/pages/ErrorPage"
import { preloadNetworkDiagnostics, preloadServerDetail } from "@/lib/route-preload"
import Server from "@/pages/Server"
import { createBrowserRouter } from "react-router-dom"

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      errorElement: <ErrorPage code={500} standalone />,
      children: [
        { index: true, element: <Server /> },
        {
          path: "server/:serverKey",
          lazy: async () => {
            const { default: Component } = await preloadServerDetail()
            return { Component }
          },
        },
        {
          path: "network",
          lazy: async () => {
            const { default: Component } = await preloadNetworkDiagnostics()
            return { Component }
          },
        },
        { path: "error", element: <ErrorPage /> },
        {
          path: "*",
          lazy: async () => {
            const { default: Component } = await import("@/pages/NotFound")
            return { Component }
          },
        },
      ],
    },
  ],
  { basename: getApplicationBasename() },
)
