import { createBrowserRouter } from "react-router-dom";
import AppShell from "./ui/AppShell";
import HomePage from "./pages/HomePage";
import ContactPage from "./pages/ContactPage";
import ArrowBuilderPage from "./ArrowBuilderPage";
import ProcessPage from "./pages/ProcessPage";
import ToolsPage from "./pages/ToolsPage";
import AdminPage from "./pages/AdminPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import MemberLoginPage from "./pages/member/MemberLoginPage";
import MemberShell from "./pages/member/MemberShell";
import MemberDashboard from "./pages/member/MemberDashboard";
import MemberBowsPage from "./pages/member/MemberBowsPage";
import MemberBuildsPage from "./pages/member/MemberBuildsPage";
import MemberOrdersPage from "./pages/member/MemberOrdersPage";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/builder", element: <ArrowBuilderPage /> },
      { path: "/process", element: <ProcessPage /> },
      { path: "/tools", element: <ToolsPage /> },
      { path: "/contact", element: <ContactPage /> },
      { path: "/admin", element: <AdminPage /> },
      { path: "/order/success", element: <OrderSuccessPage /> },
      { path: "/member", element: <MemberLoginPage /> },
      {
        path: "/member",
        element: <MemberShell />,
        children: [
          { path: "dashboard", element: <MemberDashboard /> },
          { path: "bows", element: <MemberBowsPage /> },
          { path: "builds", element: <MemberBuildsPage /> },
          { path: "orders", element: <MemberOrdersPage /> },
        ],
      },
    ],
  },
]);

