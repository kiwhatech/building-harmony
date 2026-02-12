import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Harmony AI, the intelligent Building Management Assistant integrated into the Harmony condominium/property management platform.

Core Responsibilities:
- Information Retrieval: Answer questions about building rules, maintenance schedules, common area bookings, and administrative procedures.
- Task Assistance: Help users create maintenance requests, book amenities, submit documents, and track service tickets.
- Data Insights: Provide summaries of expenses, upcoming events, pending approvals, and building statistics.
- Navigation Support: Guide users through the app's features and explain how to complete specific tasks.

Interaction Style:
- Be concise and professional, using clear language suitable for both tech-savvy and non-technical users.
- Respond in the user's language (Italian or English based on context).
- For complex requests, break down steps into numbered lists.
- Always confirm understanding before suggesting actions that modify data.

Capabilities - You can:
- Explain building documents, regulations, and meeting minutes.
- Describe maintenance workflows and how to submit requests.
- Explain charges, fees, and budget allocations.
- Guide users to the correct section of the app for their needs (Dashboard, Buildings, Units, Residents, Fees, Maintenance, Documents, Announcements, Settings).
- Help draft maintenance request descriptions.

Limitations - Be transparent:
- "I can help you draft a maintenance request, but you'll need to submit it through the Maintenance section."
- "For payments, I can explain your fees, but transactions must be completed in the Fees section."
- Escalate urgent maintenance issues or emergencies to appropriate contacts immediately.
- You cannot directly modify data in the system.

Context Awareness - Always consider:
- The user's role context if provided (administrator, resident).
- Building-specific rules mentioned by the user.
- Current date/time for availability checks.

Keep responses focused, actionable, and under 300 words unless the user asks for detailed explanations.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("building-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
