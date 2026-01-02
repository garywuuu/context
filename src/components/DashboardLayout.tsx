'use client';

import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      <Sidebar />
      <main className="ml-52 min-h-screen">
        {children}
      </main>
    </div>
  );
}
