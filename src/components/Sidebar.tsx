'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

const navItems = [
  { name: 'Agent', href: '/spec', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { name: 'Decisions', href: '/decisions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { name: 'Review', href: '/review', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
];

const bottomNavItems = [
  { name: 'Integrations', href: '/settings/integrations', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101' },
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
        <Link href="/spec" className="flex items-center gap-2">
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
