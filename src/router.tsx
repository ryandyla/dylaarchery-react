import { createBrowserRouter } from "react-router-dom";
import AppShell from "./ui/AppShell";
import HomePage from "./pages/HomePage";
import ContactPage from "./pages/ContactPage";
import ArrowBuilderPage from "./ArrowBuilderPage";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/builder", element: <ArrowBuilderPage /> },
      { path: "/contact", element: <ContactPage /> },
    ],
  },
]);
