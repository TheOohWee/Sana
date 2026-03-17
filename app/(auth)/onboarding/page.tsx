'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { USERNAME_REGEX } from '@/lib/constants';

export default function OnboardingPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const value = username.toLowerCase().trim();

    if (!USERNAME_REGEX.test(value)) {
      setError('Username must be 3-20 characters, lowercase letters, numbers, and underscores only.');
      return;
    }

    setLoading(true);

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', value)
      .single();

    if (existing) {
      setError('This username is already taken.');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired. Please sign in again.');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: value })
      .eq('id', user.id);

    if (updateError) {
      setError('Failed to set username. Please try again.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="w-full max-w-sm animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary mb-2">
          Choose your username
        </h1>
        <p className="text-text-secondary text-sm">
          This is how others will find and invite you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          placeholder="username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
            setError('');
          }}
          error={error}
          maxLength={20}
          autoFocus
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={loading}
          disabled={username.length < 3}
        >
          Continue
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-text-muted">
        3-20 characters. Lowercase letters, numbers, and underscores.
      </p>
    </div>
  );
}
