import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host');
  const isLocalEnv = process.env.NODE_ENV === 'development';

  const isLoopback = (h: string) =>
    h === 'localhost' || h.startsWith('localhost:') ||
    h === '127.0.0.1' || h.startsWith('127.0.0.1:');

  let baseUrl: string;
  if (isLocalEnv) {
    baseUrl = origin;
  } else if (forwardedHost) {
    baseUrl = `https://${forwardedHost}`;
  } else if (host && !isLoopback(host)) {
    baseUrl = `${forwardedProto}://${host}`;
  } else if (process.env.NEXT_PUBLIC_SITE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    // No reliable base URL could be determined; redirect to error page.
    // This indicates a misconfigured deployment (set NEXT_PUBLIC_SITE_URL).
    return NextResponse.redirect(`${origin}/login?error=config_error`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (!profile) {
          await supabase.from('profiles').insert({
            id: user.id,
            username: '',
            display_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
          });
          return NextResponse.redirect(`${baseUrl}/onboarding`);
        }

        if (!profile.username) {
          return NextResponse.redirect(`${baseUrl}/onboarding`);
        }
      }

      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth_error`);
}
