'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, HelperText } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader, SectionHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/EmptyState';

interface User {
  id: string;
  email: string;
  organization_id: string;
  role: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [message, setMessage] = useState('');

  const supabase = createClient();

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (userData) {
          setUser(userData);

          const { data: orgData } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', userData.organization_id)
            .single();

          if (orgData) {
            setOrganization(orgData);
            setOrgName(orgData.name);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [supabase]);

  const handleSave = async () => {
    if (!organization || !orgName.trim()) return;
    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgName.trim() })
        .eq('id', organization.id);

      if (error) throw error;
      setOrganization({ ...organization, name: orgName.trim() });
      setMessage('Saved');
      setTimeout(() => setMessage(''), 2000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error';
      setMessage(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return <DashboardLayout><div className="p-6"><LoadingState /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-xl">
          <PageHeader title="Settings" description="Account and organization" />

          {/* Account */}
          <SectionHeader title="Account" />
          <Card padding="sm" className="mb-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="mb-0">Email</Label>
                <span className="text-xs text-zinc-300">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <Label className="mb-0">Role</Label>
                <Badge variant="info">{user?.role || 'user'}</Badge>
              </div>
            </div>
          </Card>

          {/* Organization */}
          <SectionHeader title="Organization" />
          <Card padding="sm" className="mb-6">
            <div className="space-y-3">
              <div>
                <Label htmlFor="orgName">Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleSave} disabled={saving || orgName === organization?.name} loading={saving} size="sm">
                    Save
                  </Button>
                </div>
                {message && <HelperText error={message !== 'Saved'}>{message}</HelperText>}
              </div>
              <div className="flex items-center justify-between">
                <Label className="mb-0">ID</Label>
                <code className="text-[10px] text-zinc-500 font-mono">{organization?.id}</code>
              </div>
            </div>
          </Card>

          {/* Session */}
          <SectionHeader title="Session" />
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-300">Sign out</p>
                <p className="text-[10px] text-zinc-600">End current session</p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleSignOut}>Sign out</Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
