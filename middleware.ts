import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 1. Get User
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Define Paths
  const url = request.nextUrl.clone();
  const isAdminPath = url.pathname.startsWith('/admin');
  const isCaptainPath = url.pathname.startsWith('/captain');
  const isLoginPage = url.pathname === '/login';
  const isRoot = url.pathname === '/';

  // 3. Unauthenticated User Logic
  if (!user) {
    if (isAdminPath || isCaptainPath) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return response;
  }

  // 4. Authenticated User Logic
  if (user) {
    // If trying to access login page while logged in, redirect to dashboard
    if (isLoginPage) {
      // We need to know the role to redirect correctly.
      // For performance in middleware, we might sometimes skip the DB call
      // and just send to a default, but let's do a quick check if possible.
      // Ideally, store role in user_metadata to avoid this DB call.
      // For now, we will let the Login page handle the redirection logic to keep middleware fast.
      return response;
    }

    // Role-based protection (Requires fetching profile)
    // Only run this check if accessing protected routes to save DB calls on static assets
    if (isAdminPath || isCaptainPath) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role;

      // Protect Admin Routes
      if (isAdminPath && role !== 'admin') {
        url.pathname = '/captain';
        return NextResponse.redirect(url);
      }

      // Protect Captain Routes
      if (isCaptainPath && role !== 'captain') {
        url.pathname = '/admin';
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};