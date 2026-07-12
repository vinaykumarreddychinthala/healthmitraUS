import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  const contentType = request.headers.get('content-type') || '';
  const isMultipart = contentType.includes('multipart/form-data');

  // Next.js Bug Fix: Passing `request: { headers }` strips the boundary from multipart/form-data.
  let supabaseResponse = NextResponse.next(
    isMultipart ? undefined : {
      request: {
        headers: requestHeaders,
      },
    }
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next(
            isMultipart ? undefined : {
              request: {
                headers: requestHeaders,
              },
            }
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}
