"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, Code2, LayoutDashboard, Brain, RotateCcw, Database, Settings, CheckCircle2, BookOpen } from "lucide-react";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { ExportDataButton } from "@/components/dashboard/export-data";

export function AppSidebar() {
  const pathname = usePathname();

  const mainMenuItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/topics",
      label: "Topics",
      icon: BookOpen,
    },
    {
      href: "/solved",
      label: "Solved Problems",
      icon: CheckCircle2,
    },
    {
      href: "/snippets",
      label: "Code Snippets",
      icon: Code2,
    },
  ];

  const learningMenuItems = [
    {
      href: "/ai-suggester",
      label: "AI Suggester",
      icon: BrainCircuit,
    },
    {
      href: "/smart-review",
      label: "Smart Review",
      icon: RotateCcw,
    },
    {
      href: "/memory-bank",
      label: "Memory Bank",
      icon: Brain,
    },
  ];

  const adminMenuItems = [
    {
      href: "/admin/problems-import",
      label: "Problems Import",
      icon: Database,
    },
  ];

  return (
    <>
      <SidebarHeader className="px-4 py-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">LeetMastery</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarMenu>
            {mainMenuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  className="h-10 rounded-lg px-3 font-medium"
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel>Learning</SidebarGroupLabel>
          <SidebarMenu>
            {learningMenuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  className="h-10 rounded-lg px-3 font-medium"
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarMenu>
            {adminMenuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  className="h-10 rounded-lg px-3 font-medium"
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 py-4 space-y-3">
        <ExportDataButton />
        <p className="text-xs text-muted-foreground">Focus on quality</p>
      </SidebarFooter>
    </>
  );
}
