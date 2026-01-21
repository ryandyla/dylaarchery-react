import { createBrowserRouter } from "react-router-dom";
import AppShell from "./ui/AppShell";
import HomePage from "./pages/HomePage";
import ContactPage from "./pages/ContactPage";
import ArrowBuilderPage from "./ArrowBuilderPage";
import ProcessPage from "./pages/ProcessPage"; // 👈 add this
import ToolsPage from "./pages/ToolsPage";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/builder", element: <ArrowBuilderPage /> },
      { path: "/process", element: <ProcessPage /> }, // 👈 add this
      { path: "/tools", element: <ToolsPage /> },
      { path: "/contact", element: <ContactPage /> },
    ],
  },
]);

