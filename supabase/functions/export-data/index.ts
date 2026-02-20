import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables in foreign-key-safe export order
const EXPORT_TABLES = [
  "profiles",
  "user_roles",
  "academic_institutions",
  "user_analyses",
  "routines",
  "routine_products",
  "routine_optimizations",
  "chat_conversations",
  "chat_messages",
  "saved_dupes",
  "market_dupe_cache",
  "usage_limits",
  "feedback",
  "beta_feedback",
  "user_events",
  "ingredient_cache",
  "ingredient_explanations_cache",
  "rate_limit_log",
  "user_badges",
  "student_certifications",
  "expert_reviews",
  "ingredient_validations",
  "ingredient_articles",
  "product_cache",
  "waitlist",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for optional single-table or format param
    const url = new URL(req.url);
    const singleTable = url.searchParams.get("table");
    const format = url.searchParams.get("format") || "json"; // json or sql

    const tablesToExport = singleTable ? [singleTable] : EXPORT_TABLES;
    const exportData: Record<string, unknown[]> = {};
    const errors: Record<string, string> = {};

    for (const table of tablesToExport) {
      try {
        // Paginate to get all rows (bypass 1000 row limit)
        const allRows: unknown[] = [];
        let offset = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .range(offset, offset + pageSize - 1);

          if (error) {
            errors[table] = error.message;
            hasMore = false;
          } else {
            allRows.push(...(data || []));
            hasMore = (data?.length || 0) === pageSize;
            offset += pageSize;
          }
        }

        exportData[table] = allRows;
      } catch (e) {
        errors[table] = e.message;
      }
    }

    if (format === "sql") {
      // Generate INSERT statements
      let sql = "-- SkinLytix Data Export\n";
      sql += `-- Generated: ${new Date().toISOString()}\n`;
      sql += "-- Import order respects foreign key dependencies\n\n";

      for (const [table, rows] of Object.entries(exportData)) {
        if (rows.length === 0) {
          sql += `-- ${table}: 0 rows (empty)\n\n`;
          continue;
        }

        sql += `-- ${table}: ${rows.length} rows\n`;
        
        for (const row of rows as Record<string, unknown>[]) {
          const columns = Object.keys(row);
          const values = columns.map((col) => {
            const val = row[col];
            if (val === null) return "NULL";
            if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
            if (typeof val === "number") return String(val);
            if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
            return `'${String(val).replace(/'/g, "''")}'`;
          });

          sql += `INSERT INTO public.${table} (${columns.join(", ")}) VALUES (${values.join(", ")}) ON CONFLICT DO NOTHING;\n`;
        }
        sql += "\n";
      }

      return new Response(sql, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="skinlytix-data-export-${new Date().toISOString().slice(0, 10)}.sql"`,
        },
      });
    }

    // JSON format
    const result = {
      exported_at: new Date().toISOString(),
      table_counts: Object.fromEntries(
        Object.entries(exportData).map(([k, v]) => [k, v.length])
      ),
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      data: exportData,
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="skinlytix-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
