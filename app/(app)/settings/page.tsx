'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { USERNAME_REGEX } from '@/lib/constants';
import { Camera, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { profile, loading: authLoading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username);
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${profile.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast('Failed to upload avatar', 'error');
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const url = `${publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);

    await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
    await refreshProfile();
    toast('Avatar updated!', 'success');
    setUploading(false);
  }

  async function validateUsername(value: string) {
    if (value === profile?.username) {
      setUsernameError('');
      return;
    }
    if (!USERNAME_REGEX.test(value)) {
      setUsernameError('3-20 characters, lowercase letters, numbers, underscores only.');
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', value)
      .single();

    if (data) {
      setUsernameError('This username is already taken.');
    } else {
      setUsernameError('');
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || usernameError) return;

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        username,
        bio,
        location,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (error) {
      toast('Failed to save settings', 'error');
    } else {
      toast('Settings saved!', 'success');
      await refreshProfile();
    }
    setSaving(false);
  }

  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Settings</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar */}
        <Card className="flex items-center gap-4">
          <div className="relative">
            <Avatar src={avatarUrl} size="xl" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Profile Photo</p>
            <p className="text-xs text-text-muted">
              {uploading ? 'Uploading...' : 'Click the camera icon to upload'}
            </p>
          </div>
        </Card>

        {/* Fields */}
        <Card className="space-y-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
          />

          <Input
            label="Username"
            value={username}
            onChange={(e) => {
              const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
              setUsername(val);
            }}
            onBlur={() => validateUsername(username)}
            error={usernameError}
            placeholder="username"
            maxLength={20}
          />

          <Textarea
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            maxLength={160}
            showCount
            rows={3}
          />

          <Input
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Almaty, Kazakhstan"
          />
        </Card>

        {/* 2FA */}
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-text-secondary" />
            <div>
              <p className="text-sm font-medium text-text-primary">Two-Factor Authentication</p>
              <p className="text-xs text-text-muted">
                Add an extra layer of security via authenticator app
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={profile?.two_factor_enabled ? 'danger' : 'secondary'}
            size="sm"
            onClick={async () => {
              try {
                if (profile?.two_factor_enabled) {
                  const { error } = await supabase.auth.mfa.unenroll({
                    factorId: (await supabase.auth.mfa.listFactors()).data?.totp?.[0]?.id || '',
                  });
                  if (!error) {
                    await supabase.from('profiles').update({ two_factor_enabled: false }).eq('id', profile.id);
                    await refreshProfile();
                    toast('2FA disabled', 'info');
                  }
                } else {
                  const { data, error } = await supabase.auth.mfa.enroll({
                    factorType: 'totp',
                    friendlyName: 'Sana Auth',
                  });
                  if (data && !error) {
                    const qrUri = data.totp.uri;
                    window.open(qrUri, '_blank');
                    toast('Scan the QR code with your authenticator app, then verify below.', 'info');
                  }
                }
              } catch {
                toast('2FA operation failed', 'error');
              }
            }}
          >
            {profile?.two_factor_enabled ? 'Disable' : 'Enable'}
          </Button>
        </Card>

        <Button type="submit" loading={saving} size="lg" className="w-full">
          Save Changes
        </Button>
      </form>
    </div>
  );
}
