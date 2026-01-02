'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: 'Decisions', href: '/decisions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { name: 'Patterns', href: '/patterns', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { name: 'Search', href: '/search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { name: 'Policies', href: '/policies', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
];

const bottomNavItems = [
  { name: 'Capabilities', href: '/capabilities', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { name: 'Goals', href: '/goals', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { name: 'API Keys', href: '/settings/api-keys', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
  { name: 'Settings', href: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
];

interface UserInfo {
  email: string;
  orgName: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadUserInfo() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (userData) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', userData.organization_id)
            .single();

          setUserInfo({
            email: user.email || 'User',
            orgName: orgData?.name || 'Organization',
          });
        }
      } catch (error) {
        console.error('Error loading user info:', error);
      }
    }

    loadUserInfo();
  }, [supabase]);

  const NavIcon = ({ d }: { d: string }) => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
    </svg>
  );

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-52 bg-[#0c0c0d] border-r border-zinc-800/50 flex flex-col">
      {/* Logo - aligned with main content PageHeader */}
      <div className="pt-6 pb-4 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-cyan-600 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-base font-semibold text-zinc-100">Intelligent Context</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-cyan-600/20 text-cyan-400'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <NavIcon d={item.icon} />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="my-3 border-t border-zinc-800/50" />

        <div className="space-y-0.5">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/settings' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-zinc-800/50 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <NavIcon d={item.icon} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-2 border-t border-zinc-800/50">
        <Link
          href="/settings"
          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800/50 transition-all duration-150"
        >
          <div className="w-5 h-5 rounded bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-[10px] font-medium text-white">
            {userInfo?.email?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-zinc-300 truncate">
              {userInfo?.email || 'Loading...'}
            </p>
            <p className="text-[10px] text-zinc-600 truncate">
              {userInfo?.orgName || 'Organization'}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
