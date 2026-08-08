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
        { index: true, element: <Server /> },
        {
          path: "server/:serverKey",
          lazy: async () => {
            const { default: Component } = await import("@/pages/ServerDetail")
            return { Component }
          },
        },
        { path: "error", element: <ErrorPage /> },
        { path: "*", element: <NotFound /> },
      ],
    },
  ],
  { basename: getApplicationBasename() },
)
