import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  const { searchParams } = new URL(request.url);
  const message = searchParams.get("message") || "Your plan has expired. Please go and buy the plan again.";
  
  const redirectUrl = new URL("/login", request.url);
  redirectUrl.searchParams.set("message", message);
  redirectUrl.searchParams.set("expired", "true");
  
  return NextResponse.redirect(redirectUrl);
}
