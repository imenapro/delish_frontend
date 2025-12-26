import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOW_STOCK_THRESHOLD = 10;

interface LowStockItem {
  productName: string;
  shopName: string;
  currentStock: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all businesses with their owners
    const { data: businesses, error: bizError } = await supabase
      .from("businesses")
      .select("id, name, owner_id");

    if (bizError) throw bizError;

    const notifications: { businessId: string; businessName: string; ownerEmail: string; lowStockItems: LowStockItem[] }[] = [];

    for (const business of businesses || []) {
      if (!business.owner_id) continue;

      // Get owner's email from auth
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(business.owner_id);
      if (authError || !authUser.user?.email) continue;

      // Get shops for this business
      const { data: shops, error: shopsError } = await supabase
        .from("shops")
        .select("id, name")
        .eq("business_id", business.id)
        .eq("is_active", true);

      if (shopsError || !shops?.length) continue;

      const shopIds = shops.map((s) => s.id);
      const shopMap = new Map(shops.map((s) => [s.id, s.name]));

      // Get low stock items
      const { data: lowStockItems, error: invError } = await supabase
        .from("shop_inventory")
        .select(`
          shop_id,
          stock,
          product:products (name)
        `)
        .in("shop_id", shopIds)
        .lte("stock", LOW_STOCK_THRESHOLD);

      if (invError || !lowStockItems?.length) continue;

      const items: LowStockItem[] = lowStockItems.map((item: { shop_id: string; stock: number; product: { name: string } | null }) => ({
        productName: item.product?.name || "Unknown Product",
        shopName: shopMap.get(item.shop_id) || "Unknown Shop",
        currentStock: item.stock || 0,
      }));

      notifications.push({
        businessId: business.id,
        businessName: business.name,
        ownerEmail: authUser.user.email,
        lowStockItems: items,
      });
    }

    // Send emails if Resend API key is available
    const emailResults = [];
    if (resendApiKey) {
      for (const notification of notifications) {
        const outOfStock = notification.lowStockItems.filter((i) => i.currentStock === 0);
        const lowStock = notification.lowStockItems.filter((i) => i.currentStock > 0);

        const emailHtml = `
          <h2>Low Stock Alert for ${notification.businessName}</h2>
          <p>The following items need attention:</p>
          
          ${outOfStock.length > 0 ? `
            <h3 style="color: #dc2626;">Out of Stock (${outOfStock.length} items)</h3>
            <table style="border-collapse: collapse; width: 100%;">
              <tr style="background-color: #fee2e2;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Product</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Shop</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Stock</th>
              </tr>
              ${outOfStock.map((item) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.productName}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.shopName}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: #dc2626; font-weight: bold;">0</td>
                </tr>
              `).join("")}
            </table>
          ` : ""}
          
          ${lowStock.length > 0 ? `
            <h3 style="color: #ca8a04;">Low Stock (${lowStock.length} items)</h3>
            <table style="border-collapse: collapse; width: 100%;">
              <tr style="background-color: #fef9c3;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Product</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Shop</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Stock</th>
              </tr>
              ${lowStock.map((item) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.productName}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${item.shopName}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: #ca8a04; font-weight: bold;">${item.currentStock}</td>
                </tr>
              `).join("")}
            </table>
          ` : ""}
          
          <p style="margin-top: 20px; color: #666;">
            Please restock these items as soon as possible to avoid stockouts.
          </p>
        `;

        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "Kazimas <notifications@resend.dev>",
              to: [notification.ownerEmail],
              subject: `⚠️ Low Stock Alert: ${notification.lowStockItems.length} items need attention`,
              html: emailHtml,
            }),
          });

          const emailResult = await emailRes.json();
          emailResults.push({ 
            business: notification.businessName, 
            email: notification.ownerEmail,
            success: emailRes.ok,
            result: emailResult 
          });
        } catch (emailError) {
          emailResults.push({ 
            business: notification.businessName, 
            email: notification.ownerEmail,
            success: false,
            error: String(emailError) 
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        businessesChecked: businesses?.length || 0,
        notificationsGenerated: notifications.length,
        emailsSent: emailResults.filter((r) => r.success).length,
        emailResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-low-stock:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
