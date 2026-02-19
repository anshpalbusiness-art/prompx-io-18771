import React from 'react';
import { User } from '@supabase/supabase-js';
import { AppSidebar } from '@/components/AppSidebar';
import { Footer } from '@/components/Footer';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Logo } from '@/components/Logo';

interface LayoutProps {
  children: React.ReactNode;
  user?: User | null;
  showHeader?: boolean;
}

export const Layout = React.memo(({ children, user, showHeader = true }: LayoutProps) => {
  return (
    <SidebarProvider>
      <div className="h-screen w-full bg-background flex overflow-hidden">
        <AppSidebar user={user} />
        <SidebarInset className="flex flex-col flex-1 h-screen overflow-hidden">
          {/* Header with trigger - Mobile optimized - Conditionally rendered */}
          {showHeader && (
            <header className="flex h-14 sm:h-16 shrink-0 items-center gap-2 sm:gap-3 border-b border-border bg-background/95 backdrop-blur-xl px-3 sm:px-4 z-10">
              <SidebarTrigger className="text-foreground hover:bg-accent h-10 w-10 sm:h-auto sm:w-auto touch-manipulation" />
              <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4 bg-border" />
              <span className="text-base sm:text-lg font-black tracking-tight text-foreground">
                PromptX
              </span>
              {/* Spacer to push theme toggle to the right */}
              <div className="flex-1" />
              {/* Theme Toggle */}
              <ThemeToggle />
            </header>
          )}

          {/* Main Content with Footer - Scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
            <main className="min-h-full">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
});

Layout.displayName = 'Layout';

export default Layout;