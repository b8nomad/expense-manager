import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { AdminNavigation } from "./components/navigation";
import { Settings } from "lucide-react";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:flex-row">
        <aside className="lg:w-80">
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Admin console
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">
                Expense Manager
              </h1>
              <p className="text-sm text-slate-600">
                Define approval flows, manage teams, and oversee reimbursements.
              </p>
            </div>
            <AdminNavigation />
          </div>
        </aside>
        <main className="flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {children}
        </main>
      </div>
    </div>
  );
}
