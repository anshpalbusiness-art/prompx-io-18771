import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  email: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp }: OTPRequest = await req.json();

    // For now, we'll just log the OTP (in production, you'd use Resend or similar)
    console.log(`OTP for ${email}: ${otp}`);

    // TODO: Integrate with email service like Resend
    // const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    // await resend.emails.send({
    //   from: "PrompX <onboarding@resend.dev>",
    //   to: [email],
    //   subject: "Your PrompX Verification Code",
    //   html: `
    //     <h1>Verify Your Email</h1>
    //     <p>Your verification code is: <strong>${otp}</strong></p>
    //     <p>This code will expire in 10 minutes.</p>
    //   `,
    // });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP sent successfully (check console for now)" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-otp-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
