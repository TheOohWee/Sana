'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Zap, Timer, Users, Trophy } from 'lucide-react';

function GithubIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

const features = [
  { icon: Timer, label: 'Focus Timer', desc: 'Track deep work sessions' },
  { icon: Users, label: 'Parties', desc: 'Compete with friends' },
  { icon: Trophy, label: 'Leaderboards', desc: 'Climb the ranks' },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  async function handleSignIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setLoading(false);
  }

  return (
    <div className="w-full max-w-sm hero-stagger">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.04] blur-[120px] pointer-events-none" />

      <div className="relative space-y-8">
        {/* Logo & heading */}
        <div className="text-center hero-item">
          <Zap className="h-8 w-8 text-accent mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            Welcome to Sana
          </h1>
          <p className="text-sm text-text-muted mt-2">Focus together. Compete. Grow.</p>
        </div>

        {/* Feature pills */}
        <div className="flex justify-center gap-2 hero-item" style={{ animationDelay: '0.2s' }}>
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-secondary border border-border-default"
              >
                <Icon className="h-3.5 w-3.5 text-accent" />
                <div className="text-left">
                  <p className="text-[11px] font-medium text-text-primary leading-tight">{f.label}</p>
                  <p className="text-[10px] text-text-muted leading-tight">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sign in card */}
        <div className="hero-item rounded-2xl border border-border-default bg-bg-secondary p-6" style={{ animationDelay: '0.35s' }}>
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-text-primary text-bg-primary hover:opacity-90 active:scale-[0.98]"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-bg-tertiary border-t-bg-primary rounded-full animate-spin" />
            ) : (
              <GithubIcon />
            )}
            Continue with GitHub
          </button>

          <p className="mt-4 text-center text-[11px] text-text-muted leading-relaxed">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        {/* Social proof */}
        <p className="text-center text-xs text-text-muted hero-item" style={{ animationDelay: '0.5s' }}>
          Join students and makers tracking their focus
        </p>
      </div>
    </div>
  );
}
