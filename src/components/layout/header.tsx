"use client";

import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, User as UserIcon, ChevronLeft, Moon, Sun, Monitor } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";

// Page title mapping
const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/topics": "Topics",
  "/snippets": "Code Snippets",
  "/ai-suggester": "AI Suggester",
  "/solved": "Solved Problems",
  "/memory-bank": "Memory Bank",
};

export function AppHeader() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // Get page title and check if it's a detail page (has more path segments)
  const pathParts = pathname.split("/").filter(Boolean);
  const isDetailPage = pathParts.length > 1;
  const basePageTitle = PAGE_TITLES[`/${pathParts[0]}`] || "LeetMastery";

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-2 border-b border-border/40 bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      {/* Left side - different content for mobile vs desktop */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Desktop: Sidebar trigger */}
        <div className="hidden md:block">
          <SidebarTrigger className="h-8 w-8" />
        </div>
        
        {/* Mobile: Back button on detail pages, or page title */}
        <div className="flex md:hidden items-center gap-2 min-w-0">
          {isDetailPage ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 touch-manipulation"
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          ) : null}
          <h1 className="text-base font-semibold truncate">
            {basePageTitle}
          </h1>
        </div>
      </div>
      
      {/* Right side - User avatar */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="relative h-9 w-9 rounded-full hover:bg-transparent p-0 touch-manipulation"
            >
              <Avatar className="h-9 w-9 ring-2 ring-border/50">
                <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {user.displayName?.charAt(0) || <UserIcon className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="touch-manipulation">
                {theme === 'dark' ? (
                  <Moon className="mr-2 h-4 w-4" />
                ) : theme === 'light' ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : (
                  <Monitor className="mr-2 h-4 w-4" />
                )}
                <span>Theme</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("light")} className="touch-manipulation">
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")} className="touch-manipulation">
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")} className="touch-manipulation">
                    <Monitor className="mr-2 h-4 w-4" />
                    <span>System</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleSignOut} 
              className="text-muted-foreground focus:text-foreground touch-manipulation"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
