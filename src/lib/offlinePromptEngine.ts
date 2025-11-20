// Enterprise-grade offline prompt generation engine
// No cloud dependency - runs entirely on-device

export interface PromptTemplate {
  id: string;
  category: string;
  name: string;
  template: string;
  variables: string[];
  industry?: string;
}

export class OfflinePromptEngine {
  private static templates: PromptTemplate[] = [
    // Marketing Templates
    {
      id: 'marketing-email',
      category: 'marketing',
      name: 'Marketing Email Campaign',
      template: `Write a compelling marketing email for {product} targeting {audience}. 

Key benefits to highlight:
{benefits}

Tone: {tone}
Call-to-action: {cta}

Include:
- Attention-grabbing subject line
- Personalized greeting
- Clear value proposition
- Social proof or testimonials
- Urgent call-to-action`,
      variables: ['product', 'audience', 'benefits', 'tone', 'cta'],
      industry: 'marketing'
    },
    {
      id: 'social-media',
      category: 'marketing',
      name: 'Social Media Post',
      template: `Create an engaging social media post for {platform} about {topic}.

Target audience: {audience}
Goal: {goal}
Tone: {tone}

Include relevant hashtags and emojis. Keep it concise and actionable.`,
      variables: ['platform', 'topic', 'audience', 'goal', 'tone'],
      industry: 'marketing'
    },
    
    // Finance Templates
    {
      id: 'financial-analysis',
      category: 'finance',
      name: 'Financial Analysis Report',
      template: `Generate a financial analysis report for {company} covering {period}.

Key metrics to analyze:
{metrics}

Focus areas:
- Revenue trends
- Profitability ratios
- Cash flow analysis
- Risk assessment
- Future projections

Maintain professional tone and include data-driven insights.`,
      variables: ['company', 'period', 'metrics'],
      industry: 'finance'
    },
    {
      id: 'investment-memo',
      category: 'finance',
      name: 'Investment Memo',
      template: `Create an investment memo for {investment_opportunity}.

Investment type: {type}
Amount: {amount}
Timeline: {timeline}

Include:
- Executive summary
- Investment thesis
- Risk analysis
- Financial projections
- Exit strategy`,
      variables: ['investment_opportunity', 'type', 'amount', 'timeline'],
      industry: 'finance'
    },
    
    // Healthcare Templates
    {
      id: 'patient-summary',
      category: 'healthcare',
      name: 'Patient Summary',
      template: `Create a clinical summary for patient case.

Chief complaint: {complaint}
Medical history: {history}
Current medications: {medications}

Provide:
- Differential diagnosis
- Recommended tests
- Treatment plan
- Follow-up recommendations

Note: This is for educational/planning purposes only. Not medical advice.`,
      variables: ['complaint', 'history', 'medications'],
      industry: 'healthcare'
    },
    
    // Legal Templates
    {
      id: 'legal-brief',
      category: 'legal',
      name: 'Legal Brief Outline',
      template: `Create an outline for a legal brief regarding {case_type}.

Jurisdiction: {jurisdiction}
Key issues: {issues}

Structure:
- Statement of facts
- Legal issues presented
- Argument outline
- Relevant case law
- Conclusion

Note: For reference only. Consult licensed attorney for legal matters.`,
      variables: ['case_type', 'jurisdiction', 'issues'],
      industry: 'legal'
    },
    
    // Technical Templates
    {
      id: 'code-review',
      category: 'technical',
      name: 'Code Review Checklist',
      template: `Generate a code review checklist for {language} {project_type}.

Focus areas:
{focus_areas}

Include checks for:
- Code quality and readability
- Security vulnerabilities
- Performance optimization
- Best practices
- Testing coverage
- Documentation`,
      variables: ['language', 'project_type', 'focus_areas'],
      industry: 'technology'
    },
    
    // General Business Templates
    {
      id: 'meeting-agenda',
      category: 'business',
      name: 'Meeting Agenda',
      template: `Create a meeting agenda for {meeting_type}.

Duration: {duration}
Participants: {participants}
Objectives: {objectives}

Structure:
- Welcome and introductions
- Review of objectives
- Main discussion points
- Action items
- Next steps
- Q&A`,
      variables: ['meeting_type', 'duration', 'participants', 'objectives'],
      industry: 'general'
    }
  ];

  static getTemplatesByCategory(category: string): PromptTemplate[] {
    return this.templates.filter(t => t.category === category);
  }

  static getTemplatesByIndustry(industry: string): PromptTemplate[] {
    return this.templates.filter(t => t.industry === industry);
  }

  static getAllTemplates(): PromptTemplate[] {
    return this.templates;
  }

  static getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  static generatePrompt(templateId: string, variables: Record<string, string>): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    let prompt = template.template;
    template.variables.forEach(variable => {
      const value = variables[variable] || `[${variable}]`;
      prompt = prompt.replace(new RegExp(`\\{${variable}\\}`, 'g'), value);
    });

    return prompt;
  }

  static analyzePrompt(prompt: string): {
    wordCount: number;
    characterCount: number;
    estimatedTokens: number;
    complexity: 'simple' | 'moderate' | 'complex';
    suggestedImprovements: string[];
  } {
    const wordCount = prompt.trim().split(/\s+/).length;
    const characterCount = prompt.length;
    const estimatedTokens = Math.ceil(wordCount * 1.3);

    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (wordCount > 100) complexity = 'moderate';
    if (wordCount > 200) complexity = 'complex';

    const suggestedImprovements: string[] = [];
    
    if (wordCount < 10) {
      suggestedImprovements.push('Consider adding more context and details');
    }
    if (!prompt.includes('?') && wordCount < 50) {
      suggestedImprovements.push('Consider adding specific questions or requirements');
    }
    if (prompt.split('\n').length < 2 && wordCount > 50) {
      suggestedImprovements.push('Break down into multiple sections for clarity');
    }

    return {
      wordCount,
      characterCount,
      estimatedTokens,
      complexity,
      suggestedImprovements
    };
  }

  static saveCustomTemplate(template: Omit<PromptTemplate, 'id'>): PromptTemplate {
    const newTemplate: PromptTemplate = {
      ...template,
      id: `custom-${Date.now()}`
    };
    
    const customTemplates = this.getCustomTemplates();
    customTemplates.push(newTemplate);
    localStorage.setItem('customPromptTemplates', JSON.stringify(customTemplates));
    
    return newTemplate;
  }

  static getCustomTemplates(): PromptTemplate[] {
    const stored = localStorage.getItem('customPromptTemplates');
    return stored ? JSON.parse(stored) : [];
  }

  static getAllTemplatesIncludingCustom(): PromptTemplate[] {
    return [...this.templates, ...this.getCustomTemplates()];
  }
}
