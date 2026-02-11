import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  LogOut,
  User as UserIcon,
  Home,
  LayoutDashboard,
  Zap,
  TrendingUp,
  Store,
  Plug,
  Settings,
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
  ChevronRight,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface AppSidebarProps {
  user?: User | null;
}

const mainNavItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Agents', path: '/agents', icon: Zap },
  { name: 'Analytics', path: '/analytics', icon: TrendingUp },
  { name: 'Marketplace', path: '/marketplace', icon: Store },
  { name: 'Integrations', path: '/integrations', icon: Plug },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const accountItems = [
  { name: 'Profile', path: '/profile', icon: UserIcon },
  { name: 'Pricing', path: '/pricing', icon: TrendingUp },
];

const toolsItems = [
  { name: 'Visual Builder', path: '/visual-builder', icon: Layers },
  { name: 'AI Co-Pilot', path: '/ai-copilot', icon: Bot },
  { name: 'Templates', path: '/templates', icon: FileText },
  { name: 'History', path: '/history', icon: History },
  { name: 'Workflow', path: '/workflow', icon: WorkflowIcon },
  { name: 'Legal Packs', path: '/legal-packs', icon: Scale },
];

const settingsItems = [
  { name: 'API Keys', path: '/api-keys', icon: Key },
  { name: 'Usage', path: '/usage', icon: BarChart3 },
  { name: 'Compliance', path: '/compliance-dashboard', icon: ShieldCheck },
];

const advancedItems = [
  { name: 'Benchmark', path: '/benchmark', icon: Target },
  { name: 'Optimization Lab', path: '/optimization-lab', icon: Beaker },
];

const connectItems = [
  { name: 'Community', path: '/community', icon: Users },
  { name: 'Enterprise', path: '/enterprise', icon: Building2 },
  { name: 'Team', path: '/team', icon: UsersRound },
];

export const AppSidebar = React.memo(({ user }: AppSidebarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const currentPath = location.pathname;
  const { state } = useSidebar();

  // Refs for scroll position management
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  // Determine which sections should be open based on active path
  const getDefaultOpenStates = useMemo(() => {
    const hasAccountItem = accountItems.some(item => item.path === currentPath);
    const hasToolsItem = toolsItems.some(item => item.path === currentPath);
    const hasSettingsItem = settingsItems.some(item => item.path === currentPath);
    const hasAdvancedItem = advancedItems.some(item => item.path === currentPath);
    const hasConnectItem = connectItems.some(item => item.path === currentPath);

    return {
      account: hasAccountItem,
      tools: hasToolsItem,
      settings: hasSettingsItem,
      advanced: hasAdvancedItem,
      connect: hasConnectItem,
    };
  }, [currentPath]);

  // Initialize openSections from sessionStorage or default
  const [openSections, setOpenSections] = useState(() => {
    const saved = sessionStorage.getItem('sidebar-sections-state');
    const defaults = {
      account: true,
      tools: true,
      settings: getDefaultOpenStates.settings,
      advanced: getDefaultOpenStates.advanced,
      connect: getDefaultOpenStates.connect,
    };
    if (saved) {
      try {
        return { ...defaults, ...JSON.parse(saved) };
      } catch (e) {
        return defaults;
      }
    }
    return defaults;
  });

  // Save openSections to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('sidebar-sections-state', JSON.stringify(openSections));
  }, [openSections]);

  // Auto-expand sections when their items become active, but respect user choice mostly
  // We only expand if the section is closed AND it's now necessary to show the active item
  useEffect(() => {
    setOpenSections(prev => {
      const next = {
        ...prev,
        account: prev.account || getDefaultOpenStates.account,
        tools: prev.tools || getDefaultOpenStates.tools,
        settings: prev.settings || getDefaultOpenStates.settings,
        advanced: prev.advanced || getDefaultOpenStates.advanced,
        connect: prev.connect || getDefaultOpenStates.connect,
      };

      // Only update if changed to avoid unnecessary renders/storage writes
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        return next;
      }
      return prev;
    });
  }, [getDefaultOpenStates]);

  // Scroll active item into view
  const scrollActiveItemIntoView = useCallback(() => {
    if (activeItemRef.current && sidebarContentRef.current) {
      // Small delay to ensure collapsible sections are expanded and layout is stable
      setTimeout(() => {
        activeItemRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      }, 150);
    }
  }, []);

  // Scroll to active item when path changes
  useEffect(() => {
    scrollActiveItemIntoView();
  }, [currentPath, scrollActiveItemIntoView]);

  const handleLogout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
    } else {
      navigate('/auth');
    }
  }, [navigate, toast]);

  const isActive = useCallback((path: string) => currentPath === path, [currentPath]);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar dark:bg-gradient-to-b dark:from-black dark:via-zinc-950 dark:to-black shadow-2xl h-screen select-none overflow-hidden">
      {/* Header - Mobile Optimized */}
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar dark:bg-gradient-to-br dark:from-zinc-900/40 dark:via-zinc-900/20 dark:to-transparent px-4 sm:px-5 py-5 sm:py-6 flex-shrink-0 backdrop-blur-sm group-data-[collapsible=icon]:!px-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => navigate('/')}
              className="group-data-[collapsible=icon]:!p-0 hover:bg-zinc-900/60 transition-all duration-500 rounded-xl touch-manipulation min-h-[48px] justify-center"
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg overflow-hidden transition-all duration-500 group-hover:scale-110">
                <img
                  src="/promptx-logo.png"
                  alt="PromptX"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-1.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="text-lg font-extrabold tracking-tight text-sidebar-foreground">PromptX</span>
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">AI Engineering</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content - Mobile Optimized */}
      <SidebarContent
        ref={sidebarContentRef}
        className="px-2 sm:px-3 py-4 sm:py-6 flex-1 overflow-y-auto overscroll-contain group-data-[collapsible=icon]:!px-0 group-data-[collapsible=icon]:!py-4 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col"
      >
        {/* Main Navigation */}
        <SidebarGroup className="mb-6 group-data-[collapsible=icon]:mb-4 group-data-[collapsible=icon]:w-full">
          <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500/80 mb-3 flex items-center gap-3 group-data-[collapsible=icon]:hidden">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-50"></div>
            <span>Main</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-50"></div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      ref={active ? activeItemRef : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.path);
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      isActive={active}
                      tooltip={item.name}
                      className={`relative px-3 sm:px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden touch-manipulation min-h-[44px] w-full group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!min-w-10 group-data-[collapsible=icon]:!max-w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center ${active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border border-sidebar-border backdrop-blur-sm'
                        : 'hover:bg-sidebar-accent/50 text-muted-foreground hover:text-sidebar-foreground border border-transparent hover:border-sidebar-border'
                        }`}
                    >
                      {active && (
                        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-transparent pointer-events-none" />
                      )}

                      <Icon className={`h-[18px] w-[18px] transition-all duration-300 relative z-10 ${active ? 'text-sidebar-accent-foreground' : 'text-muted-foreground group-hover:text-sidebar-foreground'}`} />
                      <span className={`font-medium text-[14px] relative z-10 group-data-[collapsible=icon]:hidden ${active ? 'tracking-wide' : 'tracking-normal'}`}>{item.name}</span>

                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account */}
        <Collapsible
          open={state === 'collapsed' || openSections.account}
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, account: open }))}
          className="group/collapsible mb-8"
        >
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500/80 hover:text-zinc-300 transition-all duration-300 mb-3 flex items-center gap-3 group group-data-[collapsible=icon]:hidden">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-50"></div>
                <span>Account</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 transition-all duration-500 group-data-[state=open]/collapsible:rotate-90 group-hover:text-zinc-300" />
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-50"></div>
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
                  {accountItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          ref={active ? activeItemRef : undefined}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(item.path);
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          onFocus={(e) => e.preventDefault()}
                          isActive={active}
                          tooltip={item.name}
                          className={`relative px-3 sm:px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden touch-manipulation min-h-[44px] w-full justify-start group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!min-w-10 group-data-[collapsible=icon]:!max-w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center ${active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border border-sidebar-border backdrop-blur-sm'
                            : 'hover:bg-sidebar-accent/50 text-muted-foreground hover:text-sidebar-foreground border border-transparent hover:border-sidebar-border'
                            }`}
                        >
                          {active && (
                            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-transparent pointer-events-none group-data-[collapsible=icon]:hidden" />
                          )}

                          <Icon className={`h-[18px] w-[18px] transition-all duration-300 relative z-10 shrink-0 ${active ? 'text-sidebar-accent-foreground' : 'text-muted-foreground group-hover:text-sidebar-foreground'}`} />
                          <span className={`font-medium text-[14px] relative z-10 group-data-[collapsible=icon]:hidden ${active ? 'tracking-wide' : 'tracking-normal'}`}>{item.name}</span>

                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)] group-data-[collapsible=icon]:hidden" />
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Tools */}
        <Collapsible
          open={state === 'collapsed' || openSections.tools}
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, tools: open }))}
          className="group/collapsible mb-8"
        >
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500/80 hover:text-zinc-300 transition-all duration-300 mb-3 flex items-center gap-3 group group-data-[collapsible=icon]:hidden">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-50"></div>
                <span>Tools</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 transition-all duration-500 group-data-[state=open]/collapsible:rotate-90 group-hover:text-zinc-300" />
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-50"></div>
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
                  {toolsItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          ref={active ? activeItemRef : undefined}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(item.path);
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          onFocus={(e) => e.preventDefault()}
                          isActive={active}
                          tooltip={item.name}
                          className={`relative px-3 sm:px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden touch-manipulation min-h-[44px] w-full justify-start group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!min-w-10 group-data-[collapsible=icon]:!max-w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center ${active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border border-sidebar-border backdrop-blur-sm'
                            : 'hover:bg-sidebar-accent/50 text-muted-foreground hover:text-sidebar-foreground border border-transparent hover:border-sidebar-border'
                            }`}
                        >
                          {active && (
                            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-transparent pointer-events-none group-data-[collapsible=icon]:hidden" />
                          )}

                          <Icon className={`h-[18px] w-[18px] transition-all duration-300 relative z-10 shrink-0 ${active ? 'text-sidebar-accent-foreground' : 'text-muted-foreground group-hover:text-sidebar-foreground'}`} />
                          <span className={`font-medium text-[14px] relative z-10 group-data-[collapsible=icon]:hidden ${active ? 'tracking-wide' : 'tracking-normal'}`}>{item.name}</span>

                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)] group-data-[collapsible=icon]:hidden" />
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Settings */}
        <Collapsible
          open={state === 'collapsed' || openSections.settings}
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, settings: open }))}
          className="group/collapsible mb-8"
        >
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500/80 hover:text-zinc-300 transition-all duration-300 mb-3 flex items-center gap-3 group group-data-[collapsible=icon]:hidden">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-50"></div>
                <span>Settings</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 transition-all duration-500 group-data-[state=open]/collapsible:rotate-90 group-hover:text-zinc-300" />
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-50"></div>
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
                  {settingsItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          ref={active ? activeItemRef : undefined}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(item.path);
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          onFocus={(e) => e.preventDefault()}
                          isActive={active}
                          tooltip={item.name}
                          className={`relative px-3 sm:px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden touch-manipulation min-h-[44px] w-full justify-start group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!min-w-10 group-data-[collapsible=icon]:!max-w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center ${active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border border-sidebar-border backdrop-blur-sm'
                            : 'hover:bg-sidebar-accent/50 text-muted-foreground hover:text-sidebar-foreground border border-transparent hover:border-sidebar-border'
                            }`}
                        >
                          {active && (
                            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-transparent pointer-events-none group-data-[collapsible=icon]:hidden" />
                          )}

                          <Icon className={`h-[18px] w-[18px] transition-all duration-300 relative z-10 shrink-0 ${active ? 'text-sidebar-accent-foreground' : 'text-muted-foreground group-hover:text-sidebar-foreground'}`} />
                          <span className={`font-medium text-[14px] relative z-10 group-data-[collapsible=icon]:hidden ${active ? 'tracking-wide' : 'tracking-normal'}`}>{item.name}</span>

                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)] group-data-[collapsible=icon]:hidden" />
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Advanced */}
        <Collapsible
          open={state === 'collapsed' || openSections.advanced}
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, advanced: open }))}
          className="group/collapsible mb-8"
        >
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500/80 hover:text-zinc-300 transition-all duration-300 mb-3 flex items-center gap-3 group group-data-[collapsible=icon]:hidden">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-50"></div>
                <span>Advanced</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 transition-all duration-500 group-data-[state=open]/collapsible:rotate-90 group-hover:text-zinc-300" />
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-50"></div>
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
                  {advancedItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          ref={active ? activeItemRef : undefined}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(item.path);
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          onFocus={(e) => e.preventDefault()}
                          isActive={active}
                          tooltip={item.name}
                          className={`relative px-3 sm:px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden touch-manipulation min-h-[44px] w-full justify-start group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!min-w-10 group-data-[collapsible=icon]:!max-w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center ${active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border border-sidebar-border backdrop-blur-sm'
                            : 'hover:bg-sidebar-accent/50 text-muted-foreground hover:text-sidebar-foreground border border-transparent hover:border-sidebar-border'
                            }`}
                        >
                          {active && (
                            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-transparent pointer-events-none group-data-[collapsible=icon]:hidden" />
                          )}

                          <Icon className={`h-[18px] w-[18px] transition-all duration-300 relative z-10 shrink-0 ${active ? 'text-sidebar-accent-foreground' : 'text-muted-foreground group-hover:text-sidebar-foreground'}`} />
                          <span className={`font-medium text-[14px] relative z-10 group-data-[collapsible=icon]:hidden ${active ? 'tracking-wide' : 'tracking-normal'}`}>{item.name}</span>

                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)] group-data-[collapsible=icon]:hidden" />
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Connect */}
        <Collapsible
          open={state === 'collapsed' || openSections.connect}
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, connect: open }))}
          className="group/collapsible mb-8"
        >
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500/80 hover:text-zinc-300 transition-all duration-300 mb-3 flex items-center gap-3 group group-data-[collapsible=icon]:hidden">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-50"></div>
                <span>Connect</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 transition-all duration-500 group-data-[state=open]/collapsible:rotate-90 group-hover:text-zinc-300" />
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-50"></div>
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
                  {connectItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          ref={active ? activeItemRef : undefined}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(item.path);
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          onFocus={(e) => e.preventDefault()}
                          isActive={active}
                          tooltip={item.name}
                          className={`relative px-3 sm:px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden touch-manipulation min-h-[44px] w-full justify-start group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!min-w-10 group-data-[collapsible=icon]:!max-w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center ${active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border border-sidebar-border backdrop-blur-sm'
                            : 'hover:bg-sidebar-accent/50 text-muted-foreground hover:text-sidebar-foreground border border-transparent hover:border-sidebar-border'
                            }`}
                        >
                          {active && (
                            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-transparent pointer-events-none group-data-[collapsible=icon]:hidden" />
                          )}

                          <Icon className={`h-[18px] w-[18px] transition-all duration-300 relative z-10 shrink-0 ${active ? 'text-sidebar-accent-foreground' : 'text-muted-foreground group-hover:text-sidebar-foreground'}`} />
                          <span className={`font-medium text-[14px] relative z-10 group-data-[collapsible=icon]:hidden ${active ? 'tracking-wide' : 'tracking-normal'}`}>{item.name}</span>

                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)] group-data-[collapsible=icon]:hidden" />
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      {/* Footer - Mobile Optimized */}
      <SidebarFooter className="border-t border-sidebar-border bg-sidebar dark:bg-gradient-to-t dark:from-zinc-900/40 dark:via-zinc-900/20 dark:to-transparent px-3 sm:px-4 py-4 sm:py-5 flex-shrink-0 backdrop-blur-sm group-data-[collapsible=icon]:!px-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <SidebarMenu>
          <SidebarMenuItem className="mb-2 flex justify-center">
            <ThemeToggle />
          </SidebarMenuItem>
          <SidebarMenuItem>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent hover:bg-sidebar-accent/50 transition-all duration-500 rounded-xl px-3 sm:px-4 py-3 border border-transparent hover:border-sidebar-border group overflow-hidden relative touch-manipulation min-h-[56px] w-full group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!min-w-10 group-data-[collapsible=icon]:!max-w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-accent to-sidebar-accent/80 shadow-inner border border-sidebar-border transition-all duration-500 group-hover:scale-110 relative z-10">
                      <UserIcon className="h-5 w-5 text-sidebar-foreground" />
                    </div>
                    <div className="flex flex-col gap-1 leading-none text-left flex-1 relative z-10 ml-1 group-data-[collapsible=icon]:hidden">
                      <span className="font-semibold text-sm truncate max-w-[150px] text-sidebar-foreground transition-colors">
                        {user.email}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground group-hover:text-sidebar-foreground">Pro Plan</span>
                    </div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity group-data-[collapsible=icon]:hidden">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-[--radix-popper-anchor-width] bg-popover border-border shadow-lg rounded-xl p-1.5 gap-1 mb-2"
                >
                  <DropdownMenuItem
                    onClick={() => navigate('/profile')}
                    className="cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent focus:bg-accent rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                  >
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/settings')}
                    className="cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent focus:bg-accent rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <div className="h-px bg-border my-1 mx-2"></div>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-500 hover:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton
                size="lg"
                onClick={() => navigate('/auth')}
                className="hover:bg-sidebar-accent/50 transition-all duration-500 rounded-xl px-3 sm:px-4 py-3 border border-transparent hover:border-sidebar-border group overflow-hidden relative touch-manipulation min-h-[56px] w-full group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!min-w-10 group-data-[collapsible=icon]:!max-w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-foreground text-sidebar-primary-foreground shadow-lg transition-all duration-500 group-hover:scale-110 relative z-10">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-1 leading-none relative z-10 ml-1 group-data-[collapsible=icon]:hidden">
                  <span className="font-bold text-sidebar-foreground text-sm">Sign In</span>
                  <span className="text-[10px] font-medium text-muted-foreground">Get started</span>
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>

          {/* Sidebar Toggle Button */}
          <SidebarMenuItem>
            <SidebarTrigger className="w-full h-10 rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-foreground transition-all duration-300 border border-sidebar-border shadow-sm flex items-center justify-center gap-2 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!min-w-10 group-data-[collapsible=icon]:!max-w-10">
              <PanelLeftClose className="h-4 w-4 group-data-[collapsible=icon]:hidden" />
              <PanelLeft className="h-4 w-4 hidden group-data-[collapsible=icon]:block" />
              <span className="text-xs font-medium group-data-[collapsible=icon]:hidden">Collapse</span>
            </SidebarTrigger>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
});

AppSidebar.displayName = 'AppSidebar';
