import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-4">
      <Card className="w-full max-w-md border border-white/10 bg-zinc-900/90 backdrop-blur-xl animate-scale-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
            <Search className="w-10 h-10 text-white/40" />
          </div>
          <div>
            <CardTitle className="text-6xl font-bold text-white mb-2">404</CardTitle>
            <CardTitle className="text-2xl text-white mb-2">Page Not Found</CardTitle>
            <CardDescription className="text-zinc-400 text-base">
              The page you're looking for doesn't exist or has been moved.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={() => navigate("/")}
            className="w-full bg-white text-black hover:bg-zinc-200 font-medium transition-all h-12"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Home
          </Button>
          <Button 
            onClick={() => navigate(-1)}
            variant="outline"
            className="w-full bg-transparent border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all h-12"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
