import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MaintenanceNotificationRequest {
  requestId: string;
  requesterName: string;
  requesterEmail: string;
  buildingName: string;
  unitNumber: string;
  title: string;
  description: string;
  priority: string;
  createdAt: string;
  appUrl: string;
  adminEmails: string[];
}

const priorityLabels: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Received maintenance notification request");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: MaintenanceNotificationRequest = await req.json();
    console.log("Payload received:", JSON.stringify(payload, null, 2));

    const {
      requestId,
      requesterName,
      requesterEmail,
      buildingName,
      unitNumber,
      title,
      description,
      priority,
      createdAt,
      appUrl,
      adminEmails,
    } = payload;

    // Validate required fields
    if (!requestId || !requesterEmail || !buildingName || !title || !adminEmails?.length) {
      console.error("Missing required fields");
      throw new Error("Missing required fields");
    }

    const subject = `New maintenance request - ${buildingName} / Unit ${unitNumber}`;
    const requestUrl = `${appUrl}/maintenance?request=${requestId}`;
    const formattedDate = new Date(createdAt).toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔧 New Maintenance Request</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Requester</strong><br>
                <span style="color: #1e293b; font-size: 16px;">${requesterName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Requester Email</strong><br>
                <a href="mailto:${requesterEmail}" style="color: #3b82f6; font-size: 16px;">${requesterEmail}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Location</strong><br>
                <span style="color: #1e293b; font-size: 16px;">${buildingName} / Unit ${unitNumber}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Request Title</strong><br>
                <span style="color: #1e293b; font-size: 16px; font-weight: 600;">${title}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Description</strong><br>
                <span style="color: #1e293b; font-size: 14px;">${description || "No description provided"}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Priority</strong><br>
                <span style="color: ${priority === "4" || priority === "Urgent" ? "#dc2626" : priority === "3" || priority === "High" ? "#f59e0b" : "#1e293b"}; font-size: 16px; font-weight: 600;">${priority}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Created</strong><br>
                <span style="color: #1e293b; font-size: 16px;">${formattedDate}</span>
              </td>
            </tr>
          </table>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${requestUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Request in App →
            </a>
          </div>
        </div>
        
        <div style="background: #1e293b; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="color: #94a3b8; margin: 0; font-size: 12px;">
            This email was sent automatically when a new maintenance request was created.
          </p>
        </div>
      </div>
    `;

    console.log("Sending email to:", adminEmails);

    const emailResponse = await resend.emails.send({
      from: `Maintenance <noreply@${Deno.env.get("RESEND_DOMAIN") || "resend.dev"}>`,
      replyTo: requesterEmail,
      to: adminEmails,
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-maintenance-notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
