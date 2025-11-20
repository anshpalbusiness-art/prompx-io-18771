import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComplianceScanRequest {
  promptText?: string;
  agentId?: string;
  userId: string;
  autoRemediate?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { 
      promptText, 
      agentId, 
      userId,
      autoRemediate = false 
    }: ComplianceScanRequest = await req.json();

    console.log('Compliance scanner starting for user:', userId);

    // AI-powered compliance scan
    const scanResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a compliance and safety expert. Analyze the given prompt for:
            1. Bias (gender, racial, cultural)
            2. Privacy violations (PII requests, data exposure)
            3. Toxicity (harmful, offensive content)
            4. Regulatory concerns (GDPR, CCPA, industry-specific)
            
            Return a JSON object with:
            {
              "violations": [
                {
                  "type": "bias|privacy|toxicity|regulatory",
                  "severity": "low|medium|high|critical",
                  "description": "detailed issue description",
                  "remediation": "how to fix it"
                }
              ],
              "overallScore": 0-100,
              "isSafe": boolean
            }`
          },
          {
            role: 'user',
            content: `Analyze this prompt for compliance issues:\n\n${promptText}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!scanResponse.ok) {
      throw new Error(`Compliance scan failed: ${scanResponse.status}`);
    }

    const scanData = await scanResponse.json();
    const results = JSON.parse(scanData.choices[0].message.content);

    console.log('Compliance scan results:', results);

    // Store compliance issues
    const complianceRecords = [];
    
    for (const violation of results.violations || []) {
      const { data: record, error: insertError } = await supabase
        .from('compliance_monitoring')
        .insert({
          user_id: userId,
          agent_id: agentId,
          compliance_type: violation.type,
          severity: violation.severity,
          status: 'detected',
          issue_description: violation.description,
          detection_method: 'ai_scan',
          auto_remediation_applied: false,
          remediation_suggestion: violation.remediation,
          metadata: {
            scanTimestamp: new Date().toISOString(),
            overallScore: results.overallScore
          }
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error storing compliance record:', insertError);
        continue;
      }

      complianceRecords.push(record);

      // Create critical alert for high/critical issues
      if (violation.severity === 'high' || violation.severity === 'critical') {
        await supabase
          .from('predictive_alerts')
          .insert({
            user_id: userId,
            alert_type: 'risk',
            severity: violation.severity === 'critical' ? 'critical' : 'warning',
            title: `${violation.type.toUpperCase()} Compliance Issue Detected`,
            description: violation.description,
            predicted_impact: violation.severity === 'critical' ? 100 : 70,
            confidence_score: 0.9,
            recommended_actions: [
              { action: violation.remediation, priority: 'high' },
              { action: 'Review and update prompt', priority: 'high' }
            ]
          });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      isSafe: results.isSafe,
      overallScore: results.overallScore,
      violations: complianceRecords.length,
      records: complianceRecords,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Compliance scanner error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Compliance scan failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
