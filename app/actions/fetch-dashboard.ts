"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ApiResponse, DashboardData } from "@/types/dashboard";

export async function fetchDashboardData(): Promise<
  ApiResponse<DashboardData>
> {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated", data: null as any };
    }

    // Use Promise.allSettled to handle individual query failures gracefully
    // Use admin client for all queries to bypass RLS
    console.log("FETCH USER:", user.id);

    const results = await Promise.allSettled([
      adminClient.from("profiles").select("*").eq("id", user.id).single(),
      adminClient.from("wallets").select("*").eq("user_id", user.id).single(),
      adminClient
        .from("ecard_members")
        .select("*, plans(*)")
        .eq("user_id", user.id),
      adminClient
        .from("service_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      adminClient
        .from("reimbursement_claims")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      adminClient
        .from("notifications")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      adminClient
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active"),
    ]);

    // Extract data from settled promises
    const profileRes =
      results[0].status === "fulfilled"
        ? results[0].value
        : { data: null, error: results[0].reason };
    const walletRes =
      results[1].status === "fulfilled"
        ? results[1].value
        : { data: null, error: results[1].reason };
    const membersRes =
      results[2].status === "fulfilled"
        ? results[2].value
        : { data: null, error: results[2].reason };
    const requestsRes =
      results[3].status === "fulfilled"
        ? results[3].value
        : { data: null, error: results[3].reason };
    const claimsRes =
      results[4].status === "fulfilled"
        ? results[4].value
        : { data: null, error: results[4].reason };
    const notifsRes =
      results[5].status === "fulfilled"
        ? results[5].value
        : { data: null, error: results[5].reason };
    const customersRes =
      results[6].status === "fulfilled"
        ? results[6].value
        : { data: null, error: results[6].reason };

    // Helper to safely log errors ignoring PGRST116 (No rows returned)
    const logError = (name: string, err: any) => {
      if (err?.code === "PGRST116") return; // Ignore missing rows, we use fallbacks
      console.error(`${name} fetch error:`, err?.message || err);
    };

    // Log any errors but continue with defaults
    if (profileRes.error) logError("Profile", profileRes.error);
    if (walletRes.error) logError("Wallet", walletRes.error);
    if (membersRes.error) logError("Members", membersRes.error);
    if (requestsRes.error) logError("Requests", requestsRes.error);
    if (claimsRes.error) logError("Claims", claimsRes.error);
    if (notifsRes.error) logError("Notifications", notifsRes.error);
    if (customersRes.error) logError("Customers", customersRes.error);

    const profile = profileRes.data || {
      full_name: user.email?.split("@")[0],
      email: user.email,
      phone: "",
    };
    const wallet = walletRes.data || { balance: 0, currency: "USD" };
    const members = membersRes.data || [];
    const activeMembers = members.filter((m: any) => m.status === "active");

    // Group active/pending members by their card/purchase to get unique plans
    const activeAndPendingMembers = members.filter((m: any) => 
      m.plans && 
      (m.status === "active" || m.status === "pending")
    );

    const planGroups = new Map<string, any>();
    activeAndPendingMembers.forEach((member: any) => {
        const key = member.plan_id + "_" + (member.valid_from || member.id);
        if (!planGroups.has(key)) {
            planGroups.set(key, member);
        } else {
            // Prefer "self" to be the representative member for the plan card
            if (member.relation?.toLowerCase() === "self") {
                planGroups.set(key, member);
            }
        }
    });

    const representativeMembers = Array.from(planGroups.values());
    
    let activePlans = representativeMembers.map((member: any) => {
      const planData = member.plans;
      let daysRemaining = 0;
      if (member.valid_till) {
        const validTillDate = new Date(member.valid_till);
        if (!isNaN(validTillDate.getTime())) {
          daysRemaining = Math.max(
            0,
            Math.ceil(
              (validTillDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
          );
        }
      }
      return {
        id: member.id || planData.id,
        planId: planData.id,
        name: planData.name,
        status: member.status,
        validUntil: member.valid_till,
        daysRemaining,
        coverageAmount:
          member.coverage_amount ||
          planData.coverage_amount ||
          0,
      };
    });

    // Include plans from customers table that aren't already captured in ecard_members
    const customerData = customersRes.data || [];
    if (customerData.length > 0) {
      // Count instances of each plan_id in activePlans (from ecard_members)
      const activePlanCounts: Record<string, number> = {};
      activePlans.forEach((p: any) => {
        const pId = p.planId || p.id;
        activePlanCounts[pId] = (activePlanCounts[pId] || 0) + 1;
      });
      
      const extraPlans: any[] = [];
      customerData.forEach((c: any) => {
        if (activePlanCounts[c.plan_id] && activePlanCounts[c.plan_id] > 0) {
          activePlanCounts[c.plan_id] -= 1;
        } else {
          let daysRemaining = 0;
          if (c.valid_till) {
            const validTillDate = new Date(c.valid_till);
            if (!isNaN(validTillDate.getTime())) {
              daysRemaining = Math.max(
                0,
                Math.ceil((validTillDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              );
            }
          }
          extraPlans.push({
            id: c.id || c.plan_id,
            name: c.plan_name || "Active Plan",
            status: c.status,
            validUntil: c.valid_till,
            daysRemaining,
            coverageAmount: 0,
          });
        }
      });
        
      activePlans = [...activePlans, ...extraPlans];
    }

    // Recent Activity Merger with safe timestamp handling
    const recentActivity = [
      ...(requestsRes.data || []).map((r: any) => ({
        id: r.id,
        type: "service_request" as const,
        title: ((r.type || "request") as string)
          .replace(/_/g, " ")
          .toUpperCase(),
        description: r.subject || r.description || "",
        status: (r.status || "pending") as
          | "pending"
          | "completed"
          | "approved"
          | "rejected",
        timestamp: r.created_at || new Date().toISOString(),
      })),
      ...(claimsRes.data || []).map((c: any) => ({
        id: c.id,
        type: "reimbursement" as const,
        title: c.title || "Reimbursement",
        description: `Amount: $${c.amount || 0}`,
        status: (c.status || "pending") as
          | "pending"
          | "completed"
          | "approved"
          | "rejected",
        timestamp: c.created_at || new Date().toISOString(),
      })),
    ]
      .filter((a) => a.timestamp)
      .sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return isNaN(dateA) || isNaN(dateB) ? 0 : dateB - dateA;
      })
      .slice(0, 5);

    // Calculate reimbursement summary
    const allClaims = claimsRes.data || [];
    const reimbursementSummary = {
      totalClaimed: allClaims.reduce(
        (sum: number, c: any) => sum + (c.amount || 0),
        0,
      ),
      approved: allClaims
        .filter((c: any) => c.status === "approved")
        .reduce((sum: number, c: any) => sum + (c.amount_approved || 0), 0),
      pending: allClaims.filter((c: any) => c.status === "pending").length,
      rejected: allClaims.filter((c: any) => c.status === "rejected").length,
    };

    // Count pending items
    const pendingReqsList = (requestsRes.data || []).filter(
      (r: any) => r.status === "pending",
    );
    const pendingClaimsList = allClaims.filter(
      (c: any) => c.status === "pending",
    );
    const pendingRequests = pendingReqsList.length;
    const pendingClaims = pendingClaimsList.length;

    const requestsByPlan: Record<string, { total: number; serviceRequests: number; reimbursements: number }> = {};
    
    pendingReqsList.forEach((r: any) => {
        const pId = r.details?.plan_id;
        if (pId) {
            if (!requestsByPlan[pId]) requestsByPlan[pId] = { total: 0, serviceRequests: 0, reimbursements: 0 };
            requestsByPlan[pId].serviceRequests += 1;
            requestsByPlan[pId].total += 1;
        }
    });

    pendingClaimsList.forEach((c: any) => {
        const pId = c.plan_id;
        if (pId) {
            if (!requestsByPlan[pId]) requestsByPlan[pId] = { total: 0, serviceRequests: 0, reimbursements: 0 };
            requestsByPlan[pId].reimbursements += 1;
            requestsByPlan[pId].total += 1;
        }
    });

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          name: profile.full_name || "User",
          email: user.email ?? "",
          phone: profile.phone || "",
          avatar: profile.avatar_url || "",
        },
        activePlans,
        eCardStatus: {
          status: (activeMembers.length > 0 ? "active" : "pending") as
            | "active"
            | "pending"
            | "expired",
          totalCards: members.length,
          activeCards: activeMembers.length,
        },
        wallet: {
          balance: wallet.balance || 0,
          currency: wallet.currency || "USD",
          minimumBalance: 0,
        },
        vouchers: {
          available: 0,
          used: 0,
          expired: 0,
          totalValue: 0,
        },
        services: {
          activeServices: 0,
          completedThisMonth: 0,
          pendingApproval: 0,
        },
        members: {
          totalMembers: members.length,
          withActiveCards: activeMembers.length,
          familyMembers: members.map((m: any) => ({
            name: m.full_name || "Unknown",
            relation: m.relation || "Self",
            planId: m.plan_id || m.id,
            status: m.status
          })),
        },
        reimbursementSummary,
        pendingRequests: {
          total: pendingRequests + pendingClaims,
          breakdown: {
            serviceRequests: pendingRequests,
            reimbursements: pendingClaims,
          },
          byPlan: requestsByPlan,
        },
        recentActivity,
        notifications: (notifsRes.data || []).map((n: any) => ({
          id: n.id,
          type: n.type || "info",
          title: n.title || "Notification",
          message: n.message || "",
          timestamp: n.created_at,
          isRead: n.is_read ?? false,
        })),
      },
    };
  } catch (error: any) {
    console.error("Dashboard data fetch error:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch dashboard data",
      data: null as any,
    };
  }
}
