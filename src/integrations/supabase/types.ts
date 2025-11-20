export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ab_test_experiments: {
        Row: {
          auto_declare_winner: boolean | null
          confidence_level: number | null
          control_conversions: number | null
          control_variant: string
          created_at: string | null
          description: string | null
          ended_at: string | null
          id: string
          metadata: Json | null
          sample_size: number | null
          started_at: string | null
          statistical_significance: number | null
          status: string
          test_name: string
          treatment_conversions: number | null
          treatment_variant: string
          updated_at: string | null
          user_id: string
          winner: string | null
        }
        Insert: {
          auto_declare_winner?: boolean | null
          confidence_level?: number | null
          control_conversions?: number | null
          control_variant: string
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          sample_size?: number | null
          started_at?: string | null
          statistical_significance?: number | null
          status?: string
          test_name: string
          treatment_conversions?: number | null
          treatment_variant: string
          updated_at?: string | null
          user_id: string
          winner?: string | null
        }
        Update: {
          auto_declare_winner?: boolean | null
          confidence_level?: number | null
          control_conversions?: number | null
          control_variant?: string
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          sample_size?: number | null
          started_at?: string | null
          statistical_significance?: number | null
          status?: string
          test_name?: string
          treatment_conversions?: number | null
          treatment_variant?: string
          updated_at?: string | null
          user_id?: string
          winner?: string | null
        }
        Relationships: []
      }
      ab_test_results: {
        Row: {
          id: string
          metric_name: string
          metric_value: number
          recorded_at: string
          sample_size: number
          test_id: string
          variant: string
        }
        Insert: {
          id?: string
          metric_name: string
          metric_value: number
          recorded_at?: string
          sample_size?: number
          test_id: string
          variant: string
        }
        Update: {
          id?: string
          metric_name?: string
          metric_value?: number
          recorded_at?: string
          sample_size?: number
          test_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_tests: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          status: string
          test_name: string
          user_id: string
          variant_a_prompt: string
          variant_b_prompt: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          test_name: string
          user_id: string
          variant_a_prompt: string
          variant_b_prompt: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          test_name?: string
          user_id?: string
          variant_a_prompt?: string
          variant_b_prompt?: string
        }
        Relationships: []
      }
      adaptive_models: {
        Row: {
          accuracy_score: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_trained_at: string | null
          metadata: Json | null
          model_data: Json
          model_type: string
          model_version: number
          training_samples: number | null
          user_id: string
        }
        Insert: {
          accuracy_score?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_trained_at?: string | null
          metadata?: Json | null
          model_data: Json
          model_type: string
          model_version?: number
          training_samples?: number | null
          user_id: string
        }
        Update: {
          accuracy_score?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_trained_at?: string | null
          metadata?: Json | null
          model_data?: Json
          model_type?: string
          model_version?: number
          training_samples?: number | null
          user_id?: string
        }
        Relationships: []
      }
      admin_emails: {
        Row: {
          added_by: string | null
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      agent_analytics: {
        Row: {
          agent_id: string
          conversation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          model_used: string | null
          response_time_ms: number | null
          success: boolean | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          agent_id: string
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          model_used?: string | null
          response_time_ms?: number | null
          success?: boolean | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          agent_id?: string
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          model_used?: string | null
          response_time_ms?: number | null
          success?: boolean | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_analytics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "prompt_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_analytics_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_conversations: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          messages: Json
          metadata: Json | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          messages?: Json
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          messages?: Json
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "prompt_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          action_taken: boolean | null
          analysis_data: Json
          confidence_score: number | null
          context: Json | null
          created_at: string | null
          expires_at: string | null
          id: string
          insight_type: string
          is_actionable: boolean | null
          user_id: string
        }
        Insert: {
          action_taken?: boolean | null
          analysis_data?: Json
          confidence_score?: number | null
          context?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          insight_type: string
          is_actionable?: boolean | null
          user_id: string
        }
        Update: {
          action_taken?: boolean | null
          analysis_data?: Json
          confidence_score?: number | null
          context?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          insight_type?: string
          is_actionable?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      ai_learning_patterns: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          last_used_at: string | null
          pattern_data: Json
          pattern_type: string
          success_rate: number | null
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          pattern_data?: Json
          pattern_type: string
          success_rate?: number | null
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          pattern_data?: Json
          pattern_type?: string
          success_rate?: number | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      analytics_metrics: {
        Row: {
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          prompt_id: string | null
          recorded_at: string
          user_id: string
          workflow_id: string | null
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          prompt_id?: string | null
          recorded_at?: string
          user_id: string
          workflow_id?: string | null
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          prompt_id?: string | null
          recorded_at?: string
          user_id?: string
          workflow_id?: string | null
        }
        Relationships: []
      }
      api_key_audit_logs: {
        Row: {
          action: string
          api_key_id: string
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          success: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          api_key_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          api_key_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_key_audit_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          api_key: string
          api_key_hash: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_name: string
          key_prefix: string | null
          last_rotated_at: string | null
          last_used_at: string | null
          rate_limit_per_hour: number | null
          requests_count: number | null
          user_id: string
        }
        Insert: {
          api_key: string
          api_key_hash?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name: string
          key_prefix?: string | null
          last_rotated_at?: string | null
          last_used_at?: string | null
          rate_limit_per_hour?: number | null
          requests_count?: number | null
          user_id: string
        }
        Update: {
          api_key?: string
          api_key_hash?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name?: string
          key_prefix?: string | null
          last_rotated_at?: string | null
          last_used_at?: string | null
          rate_limit_per_hour?: number | null
          requests_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      auto_optimization_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          improvement_score: number | null
          optimization_insights: Json | null
          optimized_prompt: string | null
          original_prompt: string
          prompt_id: string | null
          status: string
          trigger_reason: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          improvement_score?: number | null
          optimization_insights?: Json | null
          optimized_prompt?: string | null
          original_prompt: string
          prompt_id?: string | null
          status?: string
          trigger_reason: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          improvement_score?: number | null
          optimization_insights?: Json | null
          optimized_prompt?: string | null
          original_prompt?: string
          prompt_id?: string | null
          status?: string
          trigger_reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_optimization_jobs_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt_history"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirements: Json
          tier: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          requirements?: Json
          tier?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirements?: Json
          tier?: string
        }
        Relationships: []
      }
      benchmark_results: {
        Row: {
          clarity_score: number | null
          created_at: string
          depth_score: number | null
          id: string
          metadata: Json | null
          model_name: string
          originality_score: number | null
          overall_score: number | null
          prompt_text: string
          response_text: string
          response_time_ms: number
          user_id: string
        }
        Insert: {
          clarity_score?: number | null
          created_at?: string
          depth_score?: number | null
          id?: string
          metadata?: Json | null
          model_name: string
          originality_score?: number | null
          overall_score?: number | null
          prompt_text: string
          response_text: string
          response_time_ms: number
          user_id: string
        }
        Update: {
          clarity_score?: number | null
          created_at?: string
          depth_score?: number | null
          id?: string
          metadata?: Json | null
          model_name?: string
          originality_score?: number | null
          overall_score?: number | null
          prompt_text?: string
          response_text?: string
          response_time_ms?: number
          user_id?: string
        }
        Relationships: []
      }
      bias_filters: {
        Row: {
          bias_type: string
          created_at: string
          filter_name: string
          id: string
          is_active: boolean | null
          keywords: string[]
          severity: string
        }
        Insert: {
          bias_type: string
          created_at?: string
          filter_name: string
          id?: string
          is_active?: boolean | null
          keywords: string[]
          severity?: string
        }
        Update: {
          bias_type?: string
          created_at?: string
          filter_name?: string
          id?: string
          is_active?: boolean | null
          keywords?: string[]
          severity?: string
        }
        Relationships: []
      }
      compliance_monitoring: {
        Row: {
          agent_id: string | null
          auto_remediation_applied: boolean | null
          compliance_type: string
          detected_at: string | null
          detection_method: string | null
          id: string
          issue_description: string
          metadata: Json | null
          prompt_id: string | null
          remediation_suggestion: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          auto_remediation_applied?: boolean | null
          compliance_type: string
          detected_at?: string | null
          detection_method?: string | null
          id?: string
          issue_description: string
          metadata?: Json | null
          prompt_id?: string | null
          remediation_suggestion?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          auto_remediation_applied?: boolean | null
          compliance_type?: string
          detected_at?: string | null
          detection_method?: string | null
          id?: string
          issue_description?: string
          metadata?: Json | null
          prompt_id?: string | null
          remediation_suggestion?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      compliance_rules: {
        Row: {
          created_at: string
          description: string | null
          detection_pattern: string
          id: string
          industry: string | null
          is_active: boolean | null
          remediation_guidance: string | null
          rule_name: string
          rule_type: string
          severity: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          detection_pattern: string
          id?: string
          industry?: string | null
          is_active?: boolean | null
          remediation_guidance?: string | null
          rule_name: string
          rule_type: string
          severity?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          detection_pattern?: string
          id?: string
          industry?: string | null
          is_active?: boolean | null
          remediation_guidance?: string | null
          rule_name?: string
          rule_type?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_violations: {
        Row: {
          auto_detected: boolean | null
          description: string
          detected_at: string | null
          id: string
          prompt_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          violation_type: string
        }
        Insert: {
          auto_detected?: boolean | null
          description: string
          detected_at?: string | null
          id?: string
          prompt_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          violation_type: string
        }
        Update: {
          auto_detected?: boolean | null
          description?: string
          detected_at?: string | null
          id?: string
          prompt_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          violation_type?: string
        }
        Relationships: []
      }
      context_suggestions: {
        Row: {
          context_type: string
          context_value: string
          created_at: string | null
          expires_at: string | null
          id: string
          relevance_score: number
          suggestions: Json
          user_id: string
        }
        Insert: {
          context_type: string
          context_value: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          relevance_score: number
          suggestions: Json
          user_id: string
        }
        Update: {
          context_type?: string
          context_value?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          relevance_score?: number
          suggestions?: Json
          user_id?: string
        }
        Relationships: []
      }
      global_insights: {
        Row: {
          category: string | null
          confidence_score: number | null
          created_at: string | null
          description: string
          expires_at: string | null
          id: string
          impact_score: number | null
          insight_type: string
          platform: string | null
          supporting_data: Json | null
          title: string
        }
        Insert: {
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description: string
          expires_at?: string | null
          id?: string
          impact_score?: number | null
          insight_type: string
          platform?: string | null
          supporting_data?: Json | null
          title: string
        }
        Update: {
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          impact_score?: number | null
          insight_type?: string
          platform?: string | null
          supporting_data?: Json | null
          title?: string
        }
        Relationships: []
      }
      global_prompt_patterns: {
        Row: {
          avg_improvement: number | null
          category: string | null
          created_at: string | null
          example_pattern: Json | null
          id: string
          pattern_description: string | null
          pattern_name: string
          pattern_type: string
          platform: string | null
          success_rate: number | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          avg_improvement?: number | null
          category?: string | null
          created_at?: string | null
          example_pattern?: Json | null
          id?: string
          pattern_description?: string | null
          pattern_name: string
          pattern_type: string
          platform?: string | null
          success_rate?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          avg_improvement?: number | null
          category?: string | null
          created_at?: string | null
          example_pattern?: Json | null
          id?: string
          pattern_description?: string | null
          pattern_name?: string
          pattern_type?: string
          platform?: string | null
          success_rate?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      global_topic_trends: {
        Row: {
          category: string | null
          created_at: string | null
          growth_rate: number | null
          id: string
          period_end: string
          period_start: string
          platform: string | null
          popularity_score: number | null
          related_topics: string[] | null
          topic_name: string
          trend_direction: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          growth_rate?: number | null
          id?: string
          period_end: string
          period_start: string
          platform?: string | null
          popularity_score?: number | null
          related_topics?: string[] | null
          topic_name: string
          trend_direction: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          growth_rate?: number | null
          id?: string
          period_end?: string
          period_start?: string
          platform?: string | null
          popularity_score?: number | null
          related_topics?: string[] | null
          topic_name?: string
          trend_direction?: string
        }
        Relationships: []
      }
      industry_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          industry: string
          platform: string
          template_name: string
          template_prompt: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          industry: string
          platform: string
          template_name: string
          template_prompt: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string
          platform?: string
          template_name?: string
          template_prompt?: string
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          category: string
          id: string
          monthly_score: number | null
          rank: number | null
          total_score: number | null
          updated_at: string
          user_id: string
          weekly_score: number | null
        }
        Insert: {
          category?: string
          id?: string
          monthly_score?: number | null
          rank?: number | null
          total_score?: number | null
          updated_at?: string
          user_id: string
          weekly_score?: number | null
        }
        Update: {
          category?: string
          id?: string
          monthly_score?: number | null
          rank?: number | null
          total_score?: number | null
          updated_at?: string
          user_id?: string
          weekly_score?: number | null
        }
        Relationships: []
      }
      learned_patterns: {
        Row: {
          confidence_score: number
          context_tags: Json | null
          created_at: string | null
          id: string
          last_successful_at: string | null
          pattern_data: Json
          pattern_name: string
          pattern_type: string
          success_rate: number
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          confidence_score?: number
          context_tags?: Json | null
          created_at?: string | null
          id?: string
          last_successful_at?: string | null
          pattern_data: Json
          pattern_name: string
          pattern_type: string
          success_rate?: number
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          confidence_score?: number
          context_tags?: Json | null
          created_at?: string | null
          id?: string
          last_successful_at?: string | null
          pattern_data?: Json
          pattern_name?: string
          pattern_type?: string
          success_rate?: number
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      legal_prompt_packs: {
        Row: {
          compliance_notes: string | null
          compliance_standards: string[] | null
          created_at: string
          id: string
          industry: string
          is_verified: boolean | null
          pack_name: string
          prompt_content: string
          prompt_title: string
          updated_at: string
          use_case: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          compliance_notes?: string | null
          compliance_standards?: string[] | null
          created_at?: string
          id?: string
          industry: string
          is_verified?: boolean | null
          pack_name: string
          prompt_content: string
          prompt_title: string
          updated_at?: string
          use_case: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          compliance_notes?: string | null
          compliance_standards?: string[] | null
          created_at?: string
          id?: string
          industry?: string
          is_verified?: boolean | null
          pack_name?: string
          prompt_content?: string
          prompt_title?: string
          updated_at?: string
          use_case?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          category: string
          created_at: string
          description: string
          downloads: number | null
          id: string
          is_active: boolean | null
          is_workflow: boolean | null
          preview_available: boolean | null
          preview_content: string | null
          price: number
          prompt_content: string
          seller_id: string
          tags: string[] | null
          title: string
          updated_at: string
          views: number | null
          workflow_steps: Json | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          downloads?: number | null
          id?: string
          is_active?: boolean | null
          is_workflow?: boolean | null
          preview_available?: boolean | null
          preview_content?: string | null
          price: number
          prompt_content: string
          seller_id: string
          tags?: string[] | null
          title: string
          updated_at?: string
          views?: number | null
          workflow_steps?: Json | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          downloads?: number | null
          id?: string
          is_active?: boolean | null
          is_workflow?: boolean | null
          preview_available?: boolean | null
          preview_content?: string | null
          price?: number
          prompt_content?: string
          seller_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          views?: number | null
          workflow_steps?: Json | null
        }
        Relationships: []
      }
      optimization_insights: {
        Row: {
          avg_improvement: number | null
          category: string
          confidence_level: string | null
          created_at: string
          id: string
          industry: string | null
          insight_type: string
          pattern_data: Json
          pattern_description: string
          platform: string | null
          sample_size: number | null
          statistical_significance: number | null
          success_rate: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avg_improvement?: number | null
          category: string
          confidence_level?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          insight_type: string
          pattern_data?: Json
          pattern_description: string
          platform?: string | null
          sample_size?: number | null
          statistical_significance?: number | null
          success_rate?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avg_improvement?: number | null
          category?: string
          confidence_level?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          insight_type?: string
          pattern_data?: Json
          pattern_description?: string
          platform?: string | null
          sample_size?: number | null
          statistical_significance?: number | null
          success_rate?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      optimization_recommendations: {
        Row: {
          actual_impact: number | null
          created_at: string | null
          description: string
          effort_level: string | null
          expected_impact: number | null
          expires_at: string | null
          id: string
          implementation_notes: string | null
          implemented_at: string | null
          priority: number | null
          recommendation_type: string
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          actual_impact?: number | null
          created_at?: string | null
          description: string
          effort_level?: string | null
          expected_impact?: number | null
          expires_at?: string | null
          id?: string
          implementation_notes?: string | null
          implemented_at?: string | null
          priority?: number | null
          recommendation_type: string
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          actual_impact?: number | null
          created_at?: string | null
          description?: string
          effort_level?: string | null
          expected_impact?: number | null
          expires_at?: string | null
          id?: string
          implementation_notes?: string | null
          implemented_at?: string | null
          priority?: number | null
          recommendation_type?: string
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      persona_templates: {
        Row: {
          avatar_icon: string
          color_theme: string
          communication_style: string
          created_at: string
          description: string
          example_phrases: string[]
          expertise_areas: string[]
          id: string
          is_active: boolean | null
          name: string
          personality_traits: Json
          prompt_prefix: string
          title: string
        }
        Insert: {
          avatar_icon: string
          color_theme?: string
          communication_style: string
          created_at?: string
          description: string
          example_phrases?: string[]
          expertise_areas?: string[]
          id?: string
          is_active?: boolean | null
          name: string
          personality_traits?: Json
          prompt_prefix: string
          title: string
        }
        Update: {
          avatar_icon?: string
          color_theme?: string
          communication_style?: string
          created_at?: string
          description?: string
          example_phrases?: string[]
          expertise_areas?: string[]
          id?: string
          is_active?: boolean | null
          name?: string
          personality_traits?: Json
          prompt_prefix?: string
          title?: string
        }
        Relationships: []
      }
      personalized_recommendations: {
        Row: {
          based_on: Json | null
          content: Json
          created_at: string | null
          description: string
          expires_at: string | null
          id: string
          is_applied: boolean | null
          is_dismissed: boolean | null
          is_viewed: boolean | null
          metadata: Json | null
          reason: string | null
          recommendation_type: string
          relevance_score: number
          title: string
          user_id: string
        }
        Insert: {
          based_on?: Json | null
          content: Json
          created_at?: string | null
          description: string
          expires_at?: string | null
          id?: string
          is_applied?: boolean | null
          is_dismissed?: boolean | null
          is_viewed?: boolean | null
          metadata?: Json | null
          reason?: string | null
          recommendation_type: string
          relevance_score: number
          title: string
          user_id: string
        }
        Update: {
          based_on?: Json | null
          content?: Json
          created_at?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          is_applied?: boolean | null
          is_dismissed?: boolean | null
          is_viewed?: boolean | null
          metadata?: Json | null
          reason?: string | null
          recommendation_type?: string
          relevance_score?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      predictive_alerts: {
        Row: {
          alert_type: string
          confidence_score: number | null
          created_at: string | null
          description: string
          expires_at: string | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          metadata: Json | null
          predicted_impact: number | null
          recommended_actions: Json | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          alert_type: string
          confidence_score?: number | null
          created_at?: string | null
          description: string
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          metadata?: Json | null
          predicted_impact?: number | null
          recommended_actions?: Json | null
          severity: string
          title: string
          user_id: string
        }
        Update: {
          alert_type?: string
          confidence_score?: number | null
          created_at?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          metadata?: Json | null
          predicted_impact?: number | null
          recommended_actions?: Json | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      predictive_models: {
        Row: {
          accuracy: number | null
          created_at: string | null
          id: string
          last_trained_at: string | null
          model_data: Json
          model_type: string
          predictions_made: number | null
          successful_predictions: number | null
          training_data_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          id?: string
          last_trained_at?: string | null
          model_data?: Json
          model_type: string
          predictions_made?: number | null
          successful_predictions?: number | null
          training_data_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          id?: string
          last_trained_at?: string | null
          model_data?: Json
          model_type?: string
          predictions_made?: number | null
          successful_predictions?: number | null
          training_data_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          avg_prompt_rating: number | null
          created_at: string
          email: string | null
          id: string
          reputation_score: number | null
          total_prompt_ratings: number | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          avg_prompt_rating?: number | null
          created_at?: string
          email?: string | null
          id: string
          reputation_score?: number | null
          total_prompt_ratings?: number | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          avg_prompt_rating?: number | null
          created_at?: string
          email?: string | null
          id?: string
          reputation_score?: number | null
          total_prompt_ratings?: number | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      prompt_agents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          max_tokens: number | null
          model: string | null
          name: string
          system_prompt: string
          tags: string[] | null
          temperature: number | null
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          max_tokens?: number | null
          model?: string | null
          name: string
          system_prompt: string
          tags?: string[] | null
          temperature?: number | null
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          max_tokens?: number | null
          model?: string | null
          name?: string
          system_prompt?: string
          tags?: string[] | null
          temperature?: number | null
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      prompt_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string
          resource_type: string
          team_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id: string
          resource_type: string
          team_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string
          resource_type?: string
          team_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_audit_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_compliance_checks: {
        Row: {
          check_results: Json
          checked_at: string
          compliance_score: number | null
          id: string
          prompt_text: string
          user_id: string
        }
        Insert: {
          check_results: Json
          checked_at?: string
          compliance_score?: number | null
          id?: string
          prompt_text: string
          user_id: string
        }
        Update: {
          check_results?: Json
          checked_at?: string
          compliance_score?: number | null
          id?: string
          prompt_text?: string
          user_id?: string
        }
        Relationships: []
      }
      prompt_deployments: {
        Row: {
          deployed_at: string | null
          deployed_by: string
          deployment_notes: string | null
          environment: string
          id: string
          prompt_version_id: string
          rollback_reason: string | null
          status: string
          team_id: string | null
        }
        Insert: {
          deployed_at?: string | null
          deployed_by: string
          deployment_notes?: string | null
          environment?: string
          id?: string
          prompt_version_id: string
          rollback_reason?: string | null
          status?: string
          team_id?: string | null
        }
        Update: {
          deployed_at?: string | null
          deployed_by?: string
          deployment_notes?: string | null
          environment?: string
          id?: string
          prompt_version_id?: string
          rollback_reason?: string | null
          status?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_deployments_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_deployments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_feedback: {
        Row: {
          agent_id: string | null
          bounce_rate: number | null
          comments_count: number | null
          context: Json | null
          conversion_rate: number | null
          created_at: string
          ctr: number | null
          engagement_score: number | null
          feedback_type: string
          id: string
          improvements: Json | null
          learned_patterns: Json | null
          likes_count: number | null
          optimized_prompt: string | null
          original_prompt: string
          prompt_id: string | null
          rating: number | null
          shares_count: number | null
          time_on_page: number | null
          updated_at: string
          user_comment: string | null
          user_id: string
          variation_id: string | null
        }
        Insert: {
          agent_id?: string | null
          bounce_rate?: number | null
          comments_count?: number | null
          context?: Json | null
          conversion_rate?: number | null
          created_at?: string
          ctr?: number | null
          engagement_score?: number | null
          feedback_type: string
          id?: string
          improvements?: Json | null
          learned_patterns?: Json | null
          likes_count?: number | null
          optimized_prompt?: string | null
          original_prompt: string
          prompt_id?: string | null
          rating?: number | null
          shares_count?: number | null
          time_on_page?: number | null
          updated_at?: string
          user_comment?: string | null
          user_id: string
          variation_id?: string | null
        }
        Update: {
          agent_id?: string | null
          bounce_rate?: number | null
          comments_count?: number | null
          context?: Json | null
          conversion_rate?: number | null
          created_at?: string
          ctr?: number | null
          engagement_score?: number | null
          feedback_type?: string
          id?: string
          improvements?: Json | null
          learned_patterns?: Json | null
          likes_count?: number | null
          optimized_prompt?: string | null
          original_prompt?: string
          prompt_id?: string | null
          rating?: number | null
          shares_count?: number | null
          time_on_page?: number | null
          updated_at?: string
          user_comment?: string | null
          user_id?: string
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_feedback_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "prompt_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_history: {
        Row: {
          created_at: string
          id: string
          optimized_prompt: string
          original_prompt: string
          platform: string
          rating: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          optimized_prompt: string
          original_prompt: string
          platform: string
          rating?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          optimized_prompt?: string
          original_prompt?: string
          platform?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_metrics: {
        Row: {
          cost: number | null
          error_message: string | null
          executed_at: string | null
          execution_time_ms: number | null
          id: string
          metadata: Json | null
          prompt_id: string
          success: boolean | null
          team_id: string | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          cost?: number | null
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          prompt_id: string
          success?: boolean | null
          team_id?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          cost?: number | null
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          prompt_id?: string
          success?: boolean | null
          team_id?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_network_insights: {
        Row: {
          actionable_suggestion: string | null
          affected_prompts: string[] | null
          affected_topics: string[] | null
          confidence_score: number | null
          created_at: string | null
          description: string | null
          id: string
          insight_type: string
          title: string
          user_id: string
        }
        Insert: {
          actionable_suggestion?: string | null
          affected_prompts?: string[] | null
          affected_topics?: string[] | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          insight_type: string
          title: string
          user_id: string
        }
        Update: {
          actionable_suggestion?: string | null
          affected_prompts?: string[] | null
          affected_topics?: string[] | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          insight_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      prompt_nodes: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          keywords: string[] | null
          metadata: Json | null
          platform: string | null
          prompt_text: string
          prompt_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          metadata?: Json | null
          platform?: string | null
          prompt_text: string
          prompt_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          metadata?: Json | null
          platform?: string | null
          prompt_text?: string
          prompt_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prompt_performance: {
        Row: {
          conversions: number | null
          created_at: string
          engagement_score: number | null
          id: string
          period_end: string
          period_start: string
          prompt_id: string
          shares: number | null
          user_id: string
          views: number | null
        }
        Insert: {
          conversions?: number | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          period_end: string
          period_start: string
          prompt_id: string
          shares?: number | null
          user_id: string
          views?: number | null
        }
        Update: {
          conversions?: number | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          period_end?: string
          period_start?: string
          prompt_id?: string
          shares?: number | null
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      prompt_purchases: {
        Row: {
          buyer_id: string
          id: string
          listing_id: string
          price: number
          purchased_at: string
        }
        Insert: {
          buyer_id: string
          id?: string
          listing_id: string
          price: number
          purchased_at?: string
        }
        Update: {
          buyer_id?: string
          id?: string
          listing_id?: string
          price?: number
          purchased_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_purchases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_purchases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "top_rated_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_purchases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "trending_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_ratings: {
        Row: {
          created_at: string
          helpful_count: number | null
          id: string
          not_helpful_count: number | null
          prompt_id: string
          rating: number
          review: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          helpful_count?: number | null
          id?: string
          not_helpful_count?: number | null
          prompt_id: string
          rating: number
          review?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          helpful_count?: number | null
          id?: string
          not_helpful_count?: number | null
          prompt_id?: string
          rating?: number
          review?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prompt_relationships: {
        Row: {
          ai_confidence: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          relationship_type: string
          source_prompt_id: string
          strength: number | null
          target_prompt_id: string
        }
        Insert: {
          ai_confidence?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          relationship_type: string
          source_prompt_id: string
          strength?: number | null
          target_prompt_id: string
        }
        Update: {
          ai_confidence?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          relationship_type?: string
          source_prompt_id?: string
          strength?: number | null
          target_prompt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_relationships_source_prompt_id_fkey"
            columns: ["source_prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_relationships_target_prompt_id_fkey"
            columns: ["target_prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_stars: {
        Row: {
          created_at: string | null
          id: string
          prompt_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          prompt_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          prompt_id?: string
          user_id?: string
        }
        Relationships: []
      }
      prompt_topic_links: {
        Row: {
          created_at: string | null
          id: string
          prompt_id: string
          relevance_score: number | null
          topic_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          prompt_id: string
          relevance_score?: number | null
          topic_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          prompt_id?: string
          relevance_score?: number | null
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_topic_links_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_topic_links_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "prompt_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_topics: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          parent_topic_id: string | null
          prompt_count: number | null
          topic_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          parent_topic_id?: string | null
          prompt_count?: number | null
          topic_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          parent_topic_id?: string | null
          prompt_count?: number | null
          topic_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_topics_parent_topic_id_fkey"
            columns: ["parent_topic_id"]
            isOneToOne: false
            referencedRelation: "prompt_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_variations: {
        Row: {
          base_prompt: string
          clicks: number | null
          confidence_score: number | null
          conversions: number | null
          created_at: string
          ended_at: string | null
          id: string
          impressions: number | null
          is_winner: boolean | null
          started_at: string | null
          test_status: string | null
          total_engagement: number | null
          updated_at: string
          user_id: string
          variation_name: string
          variation_prompt: string
          variation_type: string
        }
        Insert: {
          base_prompt: string
          clicks?: number | null
          confidence_score?: number | null
          conversions?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          impressions?: number | null
          is_winner?: boolean | null
          started_at?: string | null
          test_status?: string | null
          total_engagement?: number | null
          updated_at?: string
          user_id: string
          variation_name: string
          variation_prompt: string
          variation_type: string
        }
        Update: {
          base_prompt?: string
          clicks?: number | null
          confidence_score?: number | null
          conversions?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          impressions?: number | null
          is_winner?: boolean | null
          started_at?: string | null
          test_status?: string | null
          total_engagement?: number | null
          updated_at?: string
          user_id?: string
          variation_name?: string
          variation_prompt?: string
          variation_type?: string
        }
        Relationships: []
      }
      prompt_versions: {
        Row: {
          changelog: string | null
          created_at: string | null
          created_by: string
          id: string
          is_production: boolean | null
          metadata: Json | null
          prompt_id: string
          prompt_text: string
          version_number: number
        }
        Insert: {
          changelog?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          is_production?: boolean | null
          metadata?: Json | null
          prompt_id: string
          prompt_text: string
          version_number: number
        }
        Update: {
          changelog?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          is_production?: boolean | null
          metadata?: Json | null
          prompt_id?: string
          prompt_text?: string
          version_number?: number
        }
        Relationships: []
      }
      rating_votes: {
        Row: {
          created_at: string | null
          id: string
          is_helpful: boolean
          rating_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_helpful: boolean
          rating_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_helpful?: boolean
          rating_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_votes_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "prompt_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          steps: Json
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          steps: Json
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          steps?: Json
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          is_active: boolean | null
          limits: Json
          plan_name: string
          plan_type: string
          price_monthly: number
          price_yearly: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean | null
          limits?: Json
          plan_name: string
          plan_type: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean | null
          limits?: Json
          plan_name?: string
          plan_type?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_prompts: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          id: string
          is_workflow: boolean | null
          optimized_prompt: string | null
          original_prompt: string
          platform: string | null
          team_id: string
          title: string
          updated_at: string
          workflow_steps: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_workflow?: boolean | null
          optimized_prompt?: string | null
          original_prompt: string
          platform?: string | null
          team_id: string
          title: string
          updated_at?: string
          workflow_steps?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_workflow?: boolean | null
          optimized_prompt?: string | null
          original_prompt?: string
          platform?: string | null
          team_id?: string
          title?: string
          updated_at?: string
          workflow_steps?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "team_prompts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          count: number | null
          created_at: string
          id: string
          metadata: Json | null
          period_end: string
          period_start: string
          resource_type: string
          user_id: string
        }
        Insert: {
          count?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          period_end: string
          period_start: string
          resource_type: string
          user_id: string
        }
        Update: {
          count?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          period_end?: string
          period_start?: string
          resource_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          progress: Json | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          progress?: Json | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          progress?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          activity_type: string
          created_at: string
          duration_seconds: number | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_behavior: {
        Row: {
          behavior_type: string
          context: Json
          id: string
          metadata: Json | null
          recorded_at: string | null
          success_score: number | null
          user_id: string
        }
        Insert: {
          behavior_type: string
          context?: Json
          id?: string
          metadata?: Json | null
          recorded_at?: string | null
          success_score?: number | null
          user_id: string
        }
        Update: {
          behavior_type?: string
          context?: Json
          id?: string
          metadata?: Json | null
          recorded_at?: string | null
          success_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_personas: {
        Row: {
          created_at: string
          custom_instructions: string | null
          id: string
          is_active: boolean | null
          name: string
          template_id: string | null
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_instructions?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_id?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          custom_instructions?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_id?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_personas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "persona_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          niche: string | null
          preferred_length: string | null
          preferred_tone: string | null
          style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          niche?: string | null
          preferred_length?: string | null
          preferred_tone?: string | null
          style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          niche?: string | null
          preferred_length?: string | null
          preferred_tone?: string | null
          style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          avg_prompt_rating: number | null
          created_at: string | null
          id: string | null
          reputation_score: number | null
          total_prompt_ratings: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          avg_prompt_rating?: number | null
          created_at?: string | null
          id?: string | null
          reputation_score?: number | null
          total_prompt_ratings?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          avg_prompt_rating?: number | null
          created_at?: string | null
          id?: string | null
          reputation_score?: number | null
          total_prompt_ratings?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      top_rated_prompts: {
        Row: {
          avg_rating: number | null
          category: string | null
          description: string | null
          downloads: number | null
          id: string | null
          price: number | null
          rating_count: number | null
          seller_id: string | null
          star_count: number | null
          title: string | null
          views: number | null
        }
        Relationships: []
      }
      trending_prompts: {
        Row: {
          avg_rating: number | null
          category: string | null
          created_at: string | null
          description: string | null
          downloads: number | null
          id: string | null
          price: number | null
          rating_count: number | null
          seller_id: string | null
          star_count: number | null
          title: string | null
          trending_score: number | null
          views: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_usage_limit: {
        Args: {
          _period_days?: number
          _resource_type: string
          _user_id: string
        }
        Returns: Json
      }
      generate_api_key_hash: { Args: { _api_key: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_listing_views: {
        Args: { listing_id: string }
        Returns: undefined
      }
      is_team_owner: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      sync_existing_admins: { Args: never; Returns: undefined }
      track_usage: {
        Args: { _count?: number; _resource_type: string; _user_id: string }
        Returns: Json
      }
      update_leaderboard: { Args: never; Returns: undefined }
      validate_api_key_hash: {
        Args: { _api_key: string; _api_key_hash: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
