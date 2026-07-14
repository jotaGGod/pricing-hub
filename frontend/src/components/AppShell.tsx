import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <Sidebar />
      <div className="min-h-screen lg:pl-64">
        <Topbar />
        <main className="mx-auto w-full max-w-[1520px] px-3 pb-8 pt-3 sm:px-5 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
