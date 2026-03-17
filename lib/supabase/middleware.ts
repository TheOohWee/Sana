import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const publicPaths = ['/', '/login', '/auth/callback'];
  const isPublicPath = publicPaths.some((p) => path === p || path.startsWith('/auth/'));
  const isInvitePath = path.startsWith('/invite/');

  if (!user && !isPublicPath && !isInvitePath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (isInvitePath) {
      url.searchParams.set('redirect', path);
    }
    return NextResponse.redirect(url);
  }

  if (user && (path === '/' || path === '/login')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const url = request.nextUrl.clone();
    if (!profile?.username) {
      url.pathname = '/onboarding';
    } else {
      url.pathname = '/dashboard';
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
