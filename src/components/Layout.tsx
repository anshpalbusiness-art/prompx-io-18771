import React from 'react';
import { User } from '@supabase/supabase-js';
import { AppSidebar } from '@/components/AppSidebar';
import { Footer } from '@/components/Footer';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
  user?: User | null;
}

export const Layout = React.memo(({ children, user }: LayoutProps) => {
  return (
    <SidebarProvider>
      <div className="h-screen w-full bg-background flex overflow-hidden">
        <AppSidebar user={user} />
        <SidebarInset className="flex flex-col flex-1 h-screen overflow-hidden">
          {/* Header with trigger - Mobile optimized */}
          <header className="flex h-14 sm:h-16 shrink-0 items-center gap-2 sm:gap-3 border-b border-border bg-background/95 backdrop-blur-xl px-3 sm:px-4 z-10">
            <SidebarTrigger className="text-foreground hover:bg-accent h-10 w-10 sm:h-auto sm:w-auto touch-manipulation" />
            <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4 bg-border" />
            <div className="flex items-center gap-2 sm:gap-3 group cursor-default flex-1">
              <span className="text-base sm:text-lg font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent transition-all duration-500 group-hover:tracking-wide">
                PrompX
              </span>
            </div>
            <ThemeToggle />
          </header>

          {/* Main Content with Footer - Scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
            <main className="min-h-full">
              {children}
            </main>
            <Footer />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
});

Layout.displayName = 'Layout';

export default Layout;