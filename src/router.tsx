import App from "@/App"
import ErrorPage from "@/pages/ErrorPage"
import NotFound from "@/pages/NotFound"
import Server from "@/pages/Server"
import ServerDetail from "@/pages/ServerDetail"
import { createBrowserRouter } from "react-router-dom"

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      errorElement: <ErrorPage code={500} />,
      children: [
        { index: true, element: <Server /> },
        { path: "server/:serverKey", element: <ServerDetail /> },
        { path: "error", element: <ErrorPage /> },
        { path: "*", element: <NotFound /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
)
