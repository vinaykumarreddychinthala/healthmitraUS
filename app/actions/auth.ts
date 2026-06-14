"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/email";
import { planPurchaseWelcomeTemplate } from "@/lib/email-templates";

export async function login(formData: FormData) {
  const supabase = await createClient();

  let email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // If the input doesn't look like an email, assume it's a User ID (e.g. HM-XXXXXX)
  if (!email.includes("@")) {
    const adminClient = await createAdminClient();
    
    // First lookup in ecard_members to find the user_id
    const { data: member } = await adminClient
      .from('ecard_members')
      .select('user_id')
      .eq('card_unique_id', email)
      .limit(1)
      .single();
      
    if (member?.user_id) {
        // Then get the email from profiles
        const { data: profile } = await adminClient
          .from('profiles')
          .select('email')
          .eq('id', member.user_id)
          .single();
          
        if (profile?.email) {
            email = profile.email;
        }
    }
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (authData?.user) {
    const adminClient = await createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      console.error("Error fetching admin profile:", profileError);
    }

    if (profile?.role === "admin") {
      revalidatePath("/", "layout");
      return { success: true, redirect: "/admin/dashboard" };
    }

    // For customers, check if they have any active members/plans
    const today = new Date().toISOString().split('T')[0];
    const { data: allMembers, error: membersError } = await adminClient
      .from('ecard_members')
      .select('id, valid_till')
      .eq('user_id', authData.user.id);

    if (membersError) {
      console.error("Error fetching member plans:", membersError);
    }

    if (!allMembers || allMembers.length === 0) {
      await supabase.auth.signOut();
      return { error: "No active plan found. Please go and buy a plan." };
    }

    const hasActivePlan = allMembers.some(m => m.valid_till && m.valid_till >= today);
    if (!hasActivePlan) {
      await supabase.auth.signOut();
      return { error: "Your plan has expired. Please go and buy the plan again." };
    }

    // Check KYC status — redirect directly so there's no double-redirect
    const activeIds = allMembers
      .filter(m => m.valid_till && m.valid_till >= today)
      .map(m => m.id);

    if (activeIds.length > 0) {
      const { data: kycRecords } = await adminClient
        .from('policy_holder_kyc')
        .select('member_id')
        .eq('kyc_submitted', true)
        .eq('admin_reset', false)
        .in('member_id', activeIds);

      const completedKycIds = new Set((kycRecords || []).map((k: { member_id: string }) => k.member_id));
      const hasPendingKyc = activeIds.some(id => !completedKycIds.has(id));

      if (hasPendingKyc) {
        revalidatePath("/", "layout");
        return { success: true, redirect: "/e-cards" };
      }
    }
  }

  revalidatePath("/", "layout");
  return { success: true, redirect: "/dashboard" };
}

// export async function signup(formData: FormData) {
//   let supabase;
//   let isAdmin = false;

//   // Try to get admin client, fallback to standard if fails (e.g. missing key)
//   try {
//     if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
//       throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
//     }
//     supabase = await createAdminClient();
//     isAdmin = true;
//   } catch (e) {
//     console.warn(
//       "Failed to create admin client, falling back to standard signup:",
//       e,
//     );
//     supabase = await createClient();
//   }

//   const email = formData.get("email") as string;
//   const password = formData.get("password") as string;
//   const fullName = formData.get("fullName") as string;
//   const phone = (formData.get("phone") as string) || "";

//   let error;

//   if (isAdmin) {
//     // 1. Create User (Admin API - auto confirms email)
//     const result = await supabase.auth.admin.createUser({
//       email,
//       password,
//       email_confirm: true, // Bypass verification
//       user_metadata: {
//         full_name: fullName,
//         phone: phone,
//       },
//     });
//     error = result.error;

//     if (!error && result.data?.user) {
//       // 2. Create profile record
//       const { error: profileError } = await supabase.from("profiles").upsert({
//         id: result.data.user.id,
//         email: email,
//         full_name: fullName,
//         phone: phone,
//         role: "customer",
//         created_at: new Date().toISOString(),
//         updated_at: new Date().toISOString(),
//       });

//       if (profileError) {
//         console.error("Profile creation error:", profileError);
//       }

//       // 3. Sign In immediately if admin creation worked
//       const supabaseClient = await createClient();
//       const { error: signInError } =
//         await supabaseClient.auth.signInWithPassword({
//           email,
//           password,
//         });

//       return { success: true, redirect: "/login" };
//       if (signInError) {
//         return {
//           error:
//             "Account created but failed to sign in automatically. Please login.",
//         };
//       }
//     }
//   } else {
//     // Fallback: Standard Signup
//     const result = await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         data: {
//           full_name: fullName,
//           phone: phone,
//         },
//       },
//     });
//     error = result.error;

//     // Create profile after successful signup using admin client
//     if (!error && result.data?.user) {
//       try {
//         const adminClient = await createAdminClient();
//         const { error: profileError } = await adminClient
//           .from("profiles")
//           .upsert({
//             id: result.data.user.id,
//             email: email,
//             full_name: fullName,
//             phone: phone,
//             role: "customer",
//             created_at: new Date().toISOString(),
//             updated_at: new Date().toISOString(),
//           });

//         if (profileError) {
//           console.error("Profile creation error:", profileError);
//         }
//       } catch (e) {
//         console.error("Admin client error for profile creation:", e);
//       }
//     }
//   }

//   if (error) {
//     console.error("Signup Error:", error.message);
//     return { error: error.message };
//   }

//   // Check user role for redirect
//   revalidatePath("/", "layout");

//   // For admin creation flow, the role is typically set outside standard signup
//   // but just checking the db directly is safest
//   let redirectPath = "/dashboard";

//   const supabaseClient = await createClient();
//   const { data: authData } = await supabaseClient.auth.getUser();
//   if (authData?.user) {
//     const adminClient = await createAdminClient();
//     const { data: profile } = await adminClient
//       .from("profiles")
//       .select("role")
//       .eq("id", authData.user.id)
//       .single();
//     if (profile?.role === "admin") {
//       redirectPath = "/admin/dashboard";
//     }
//   }

//   return { success: true, redirect: redirectPath };
// }



export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
