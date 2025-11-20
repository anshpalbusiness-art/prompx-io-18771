import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { prompt, userId } = await req.json();

    if (!prompt || !userId) {
      throw new Error('Missing required fields');
    }

    console.log('Checking prompt compliance for user:', userId);

    // Fetch compliance rules and bias filters
    const [rulesResult, filtersResult] = await Promise.all([
      supabase.from('compliance_rules').select('*').eq('is_active', true),
      supabase.from('bias_filters').select('*').eq('is_active', true)
    ]);

    const rules = rulesResult.data || [];
    const filters = filtersResult.data || [];

    // Check for violations
    const violations: any[] = [];
    const warnings: any[] = [];

    // Check compliance rules
    for (const rule of rules) {
      const regex = new RegExp(rule.detection_pattern, 'gi');
      if (regex.test(prompt)) {
        const issue = {
          type: rule.rule_type,
          severity: rule.severity,
          rule: rule.rule_name,
          description: rule.description,
          remediation: rule.remediation_guidance
        };
        
        if (rule.severity === 'critical' || rule.severity === 'high') {
          violations.push(issue);
        } else {
          warnings.push(issue);
        }
      }
    }

    // Check bias filters
    for (const filter of filters) {
      const keywords = filter.keywords;
      const foundKeywords = keywords.filter((keyword: string) => 
        new RegExp(`\\b${keyword}\\b`, 'gi').test(prompt)
      );
      
      if (foundKeywords.length > 0) {
        const issue = {
          type: 'bias',
          biasType: filter.bias_type,
          severity: filter.severity,
          filter: filter.filter_name,
          foundKeywords
        };
        
        if (filter.severity === 'high') {
          violations.push(issue);
        } else {
          warnings.push(issue);
        }
      }
    }

    // Use AI to detect subtle bias and compliance issues
    console.log('Using AI for advanced compliance check...');
    
    const aiAnalysisPrompt = `Analyze the following prompt for bias, compliance issues, and ethical concerns. Consider:
1. Gender, racial, age, religious, or political bias
2. Personally identifiable information (PII)
3. Harmful or discriminatory language
4. Privacy concerns
5. Professional appropriateness

Prompt to analyze:
"${prompt}"

Provide a JSON response with:
{
  "hasBias": boolean,
  "biasTypes": string[],
  "complianceIssues": string[],
  "ethicalConcerns": string[],
  "recommendations": string[]
}`;

    const aiResponse = await fetch(`${supabaseUrl}/functions/v1/lovable-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a compliance and bias detection expert. Analyze prompts for potential issues and provide structured feedback.' },
          { role: 'user', content: aiAnalysisPrompt }
        ],
        model: 'google/gemini-2.5-flash'
      })
    });

    let aiAnalysis = null;
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      try {
        // Extract JSON from AI response
        const content = aiData.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiAnalysis = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Failed to parse AI response:', e);
      }
    }

    // Incorporate AI findings
    if (aiAnalysis) {
      if (aiAnalysis.hasBias && aiAnalysis.biasTypes?.length > 0) {
        warnings.push({
          type: 'ai_detected_bias',
          severity: 'medium',
          biasTypes: aiAnalysis.biasTypes,
          description: 'AI detected potential bias in the prompt'
        });
      }
      
      if (aiAnalysis.complianceIssues?.length > 0) {
        violations.push({
          type: 'ai_detected_compliance',
          severity: 'high',
          issues: aiAnalysis.complianceIssues,
          description: 'AI detected potential compliance issues'
        });
      }
    }

    // Calculate compliance score (0-100)
    const totalIssues = violations.length + warnings.length;
    const violationWeight = 20;
    const warningWeight = 5;
    const maxDeduction = violations.length * violationWeight + warnings.length * warningWeight;
    const complianceScore = Math.max(0, 100 - maxDeduction);

    const passed = violations.length === 0;

    const checkResults = {
      passed,
      violations,
      warnings,
      score: complianceScore,
      aiAnalysis,
      checkedAt: new Date().toISOString()
    };

    // Store the compliance check
    const { error: insertError } = await supabase
      .from('prompt_compliance_checks')
      .insert({
        user_id: userId,
        prompt_text: prompt,
        check_results: checkResults,
        compliance_score: complianceScore
      });

    if (insertError) {
      console.error('Error storing compliance check:', insertError);
    }

    console.log('Compliance check complete:', {
      passed,
      violations: violations.length,
      warnings: warnings.length,
      score: complianceScore
    });

    return new Response(
      JSON.stringify(checkResults),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in check-prompt-compliance:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
