import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove: (name: string, options: any) => {
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Handle tenant routing
  const hostname = req.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]
  const isCustomDomain = !hostname.includes('localhost') && hostname.split('.').length > 2

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/reset-password']
  const isPublicRoute = publicRoutes.some(route => req.nextUrl.pathname.startsWith(route))

  // If no session and not on a public route, redirect to login
  if (!session && !isPublicRoute) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If on login/signup page and has session, redirect to dashboard
  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Handle tenant routing
  if (!isPublicRoute && !isCustomDomain) {
    // If no subdomain and not on main domain, redirect to main domain
    if (subdomain === 'www' || subdomain === 'app') {
      const url = req.nextUrl.clone()
      url.host = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'app.localhost:3000'
      return NextResponse.redirect(url)
    }

    // If on main domain and has tenant, redirect to tenant subdomain
    if (session?.user?.user_metadata?.tenant_id && subdomain === 'app') {
      const url = req.nextUrl.clone()
      url.host = `${session.user.user_metadata.tenant_id}.${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000'}`
      return NextResponse.redirect(url)
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 