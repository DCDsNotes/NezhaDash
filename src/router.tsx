import App from "@/App"
import { getApplicationBasename } from "@/lib/app-base"
import ErrorPage from "@/pages/ErrorPage"
import NotFound from "@/pages/NotFound"
import Server from "@/pages/Server"
import { createBrowserRouter } from "react-router-dom"

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      errorElement: <ErrorPage code={500} />,
      children: [
        { index: true, element: <Server />, errorElement: <ErrorPage code={500} /> },
        {
          path: "server/:serverKey",
          errorElement: <ErrorPage code={500} />,
          lazy: async () => {
            const { default: Component } = await import("@/pages/ServerDetail")
            return { Component }
          },
        },
        {
          path: "network",
          errorElement: <ErrorPage code={500} />,
          lazy: async () => {
            const { default: Component } = await import("@/pages/NetworkDiagnostics")
            return { Component }
          },
        },
        { path: "error", element: <ErrorPage />, errorElement: <ErrorPage code={500} /> },
        { path: "*", element: <NotFound />, errorElement: <ErrorPage code={500} /> },
      ],
    },
  ],
  { basename: getApplicationBasename() },
)
