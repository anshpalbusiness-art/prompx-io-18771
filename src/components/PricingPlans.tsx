import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

interface PricingPlansProps {
  user: User | null;
}

// This component now redirects to the main pricing page
export default function PricingPlans({ user }: PricingPlansProps) {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the main pricing page
    navigate('/pricing');
  }, [navigate]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        <p className="text-white">Redirecting to pricing page...</p>
      </div>
    </div>
  );
}