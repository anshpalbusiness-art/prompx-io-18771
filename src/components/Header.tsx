import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  LogOut, 
  Menu, 
  ChevronDown, 
  User as UserIcon, 
  Layers, 
  Bot, 
  FileText, 
  History, 
  Workflow as WorkflowIcon, 
  Scale, 
  Key, 
  BarChart3, 
  ShieldCheck, 
  Target, 
  Beaker, 
  Users, 
  Building2, 
  UsersRound,
  Home,
  LayoutDashboard,
  Zap,
  TrendingUp,
  Store,
  Plug,
  Settings
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  user?: User | null;
}

export const Header = ({ user }: HeaderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  React.useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    };
    
    checkAdminStatus();
  }, [user]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
    setMobileMenuOpen(false);
  };

  // Primary nav items shown in desktop header
  const primaryNavItems = [
    { name: 'HOME', path: '/', icon: Home },
    { name: 'DASHBOARD', path: '/dashboard', icon: LayoutDashboard },
    { name: 'AI AGENTS', path: '/agents', icon: Zap },
    { name: 'ANALYTICS', path: '/analytics', icon: TrendingUp },
    { name: 'MARKETPLACE', path: '/marketplace', icon: Store },
    { name: 'INTEGRATIONS', path: '/integrations', icon: Plug },
    { name: 'SETTINGS', path: '/settings', icon: Settings },
  ];

  // Additional items in "More" dropdown with icons
  const moreNavItems = [
    // Prompt Engineer quick actions
    { name: 'Profile', path: '/profile', icon: UserIcon, category: 'Account' },
    { name: 'Pricing', path: '/pricing', icon: TrendingUp, category: 'Account' },
    { name: 'Visual Builder', path: '/visual-builder', icon: Layers, category: 'Tools' },
    { name: 'AI Co-Pilot', path: '/ai-copilot', icon: Bot, category: 'Tools' },
    { name: 'Templates', path: '/templates', icon: FileText, category: 'Tools' },
    { name: 'History', path: '/history', icon: History, category: 'Tools' },
    { name: 'Workflow', path: '/workflow', icon: WorkflowIcon, category: 'Tools' },
    { name: 'Legal Packs', path: '/legal-packs', icon: Scale, category: 'Tools' },
    { name: 'API Keys', path: '/api-keys', icon: Key, category: 'Settings' },
    { name: 'Usage', path: '/usage', icon: BarChart3, category: 'Settings' },
    { name: 'Compliance', path: '/compliance-dashboard', icon: ShieldCheck, category: 'Settings' },
    // Other sections
    { name: 'Benchmark', path: '/benchmark', icon: Target, category: 'Advanced' },
    { name: 'Optimization Lab', path: '/optimization-lab', icon: Beaker, category: 'Advanced' },
    { name: 'Community', path: '/community', icon: Users, category: 'Connect' },
    { name: 'Enterprise', path: '/enterprise', icon: Building2, category: 'Connect' },
    { name: 'Team', path: '/team', icon: UsersRound, category: 'Connect' },
  ];

  // All nav items for mobile menu with icons
  const allMobileNavItems = [
    ...primaryNavItems,
    ...moreNavItems,
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-black via-zinc-950 to-black backdrop-blur-2xl border-b border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.5)] w-full">
      <div className="w-full">
        <div className="responsive-container">
          <div className="flex items-center justify-between h-16 lg:h-[4.5rem] gap-4 lg:gap-8">
            {/* Left Section: Sign Out + Logo */}
            <div className="flex items-center gap-3 lg:gap-5 flex-shrink-0">
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="hidden lg:flex items-center justify-center h-9 px-4 bg-white/5 border border-white/10 text-white/90 hover:bg-white/10 hover:text-white hover:border-white/20 rounded-lg font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:shadow-white/5"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              )}
              
              <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-2.5 flex-shrink-0 group"
              >
                <div className="relative w-9 h-9 lg:w-10 lg:h-10">
                  <div className="absolute inset-0 bg-gradient-to-br from-white via-zinc-100 to-zinc-200 rounded-lg rotate-0 group-hover:rotate-6 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white to-zinc-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Sparkles className="w-[1.125rem] h-[1.125rem] lg:w-5 lg:h-5 text-black" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="text-lg lg:text-xl font-black text-white tracking-tight group-hover:tracking-wide transition-all duration-300">
                  PrompX
                </span>
              </button>
            </div>

            {/* Center Section: Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-start lg:pl-6 xl:pl-10">
              {primaryNavItems.map((link) => {
                const isActive = window.location.pathname === link.path;
                return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`relative group/btn px-3.5 xl:px-4 py-2 text-[0.8125rem] font-semibold rounded-lg transition-all duration-200 tracking-tight whitespace-nowrap flex items-center justify-center ${
                    isActive
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
                  }`}
                >
                    {link.name}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-lg -z-10" />
                    )}
                  </button>
                );
              })}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative px-3.5 xl:px-4 py-2 text-[0.8125rem] font-semibold rounded-lg transition-all duration-200 tracking-tight whitespace-nowrap text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 flex items-center justify-center gap-1.5 group">
                    MORE
                    <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  className="min-w-[340px] max-h-[600px] overflow-y-auto bg-zinc-950/98 backdrop-blur-2xl border border-white/15 shadow-[0_20px_70px_rgba(0,0,0,0.9)] z-[100] rounded-xl"
                  sideOffset={12}
                >
                  {['Account', 'Tools', 'Settings', 'Advanced', 'Connect'].map((category, idx) => {
                    const categoryItems = moreNavItems.filter(item => item.category === category);
                    if (categoryItems.length === 0) return null;
                    
                    return (
                      <div key={category} className={idx > 0 ? "border-t border-white/10 pt-2" : "pt-1"}>
                        <div className="px-4 pt-3 pb-2 text-[0.6875rem] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-zinc-600" />
                          {category}
                        </div>
                        <div className="px-2 pb-2 space-y-0.5">
                          {categoryItems.map((link) => {
                            const Icon = link.icon;
                            return (
                              <DropdownMenuItem
                                key={link.path}
                                onSelect={() => {
                                  navigate(link.path);
                                }}
                                className="cursor-pointer font-medium text-sm py-2.5 px-3 rounded-lg transition-all duration-200 group hover:bg-white/5"
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:bg-white/10 group-hover:border-white/20">
                                    <Icon className="w-4 h-4 text-zinc-300 group-hover:text-white" strokeWidth={2} />
                                  </div>
                                  <span className="text-zinc-300 group-hover:text-white font-medium tracking-tight">{link.name}</span>
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            {/* Right Section: User Info */}
            <div className="hidden lg:flex items-center justify-end gap-3 flex-shrink-0">
              {user ? (
                <div className="flex items-center text-sm text-zinc-300 font-medium px-4 py-2 h-9 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm transition-all duration-200 hover:bg-white/10 hover:border-white/20 cursor-default max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap">
                  {user.email}
                </div>
              ) : (
                <Button
                  onClick={() => navigate("/auth")}
                  size="sm"
                  className="flex items-center bg-gradient-to-r from-white via-zinc-50 to-white text-black hover:from-zinc-100 hover:via-white hover:to-zinc-100 h-9 px-5 font-bold shadow-[0_8px_24px_rgba(255,255,255,0.15)] hover:shadow-[0_12px_32px_rgba(255,255,255,0.25)] transition-all duration-200 rounded-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  Sign In
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden flex items-center justify-center text-white hover:bg-white/10 rounded-lg h-9 w-9 p-0 transition-all duration-200 border border-white/10 hover:border-white/20"
                >
                  <Menu className="w-[1.125rem] h-[1.125rem]" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[90vw] max-w-[380px] bg-gradient-to-b from-zinc-950 to-black border-l border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col z-[100]">
                <div className="flex flex-col h-full pt-6">
                  {/* Mobile Logo */}
                  <div className="flex items-center gap-2.5 px-1 mb-8 flex-shrink-0">
                    <div className="relative w-10 h-10">
                      <div className="absolute inset-0 bg-gradient-to-br from-white to-zinc-100 rounded-lg" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-black" strokeWidth={2.5} />
                      </div>
                    </div>
                    <span className="text-xl font-black text-white tracking-tight">
                      PrompX
                    </span>
                  </div>

                  {/* Scrollable Navigation */}
                  <ScrollArea className="flex-1 px-1">
                    <nav className="flex flex-col gap-3 pb-4">
                    {['Main', 'Account', 'Tools', 'Settings', 'Advanced', 'Connect'].map((category) => {
                      const categoryItems = category === 'Main' 
                        ? primaryNavItems
                        : moreNavItems.filter(item => item.category === category);
                      
                      if (categoryItems.length === 0) return null;
                      
                      return (
                        <div key={category} className="mb-4">
                          <div className="px-3 py-2 text-[0.6875rem] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-zinc-700" />
                            {category}
                          </div>
                          <div className="space-y-1">
                            {categoryItems.map((link) => {
                              const isActive = window.location.pathname === link.path;
                              const Icon = link.icon;
                              return (
                                <button
                                  key={link.path}
                                  onClick={() => {
                                    navigate(link.path);
                                    setMobileMenuOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2.5 text-sm font-medium tracking-tight rounded-lg transition-all duration-200 flex items-center gap-3 border ${
                                    isActive
                                      ? 'bg-white/10 text-white border-white/20'
                                      : 'text-zinc-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 border ${
                                    isActive ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'
                                  }`}>
                                    <Icon className="w-4 h-4" strokeWidth={2} />
                                  </div>
                                  <span>{link.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    </nav>
                  </ScrollArea>

                  {/* Fixed User Section */}
                  {user && (
                    <div className="pt-5 border-t border-white/10 space-y-3 px-1 flex-shrink-0 mt-4">
                      <div className="flex items-center text-sm text-zinc-300 font-medium px-4 py-2.5 bg-white/5 rounded-lg border border-white/10 cursor-default overflow-hidden text-ellipsis whitespace-nowrap">
                        {user.email}
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center h-10 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 rounded-lg font-semibold transition-all duration-200"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
