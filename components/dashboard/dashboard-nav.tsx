"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth/auth-provider"
import { LayoutDashboard, User, Briefcase, MessageSquare, Settings, FileText, Search, Users } from "lucide-react"

export function DashboardNav() {
  const pathname = usePathname()
  const { userData } = useAuth()

  // Define navigation items based on user role
  const navItems =
    userData?.role === "freelancer"
      ? [
          {
            title: "Overview",
            href: "/dashboard",
            icon: <LayoutDashboard className="w-5 h-5" />,
          },
          {
            title: "My Profile",
            href: "/dashboard/profile",
            icon: <User className="w-5 h-5" />,
          },
          {
            title: "My Services",
            href: "/dashboard/services",
            icon: <Briefcase className="w-5 h-5" />,
          },
          {
            title: "Client Requests",
            href: "/dashboard/requests",
            icon: <FileText className="w-5 h-5" />,
          },
          {
            title: "Projects",
            href: "/dashboard/projects",
            icon: <Briefcase className="w-5 h-5" />,
          },
          {
            title: "Messages",
            href: "/dashboard/messages",
            icon: <MessageSquare className="w-5 h-5" />,
          },
          {
            title: "Settings",
            href: "/dashboard/settings",
            icon: <Settings className="w-5 h-5" />,
          },
        ]
      : [
          {
            title: "Overview",
            href: "/dashboard",
            icon: <LayoutDashboard className="w-5 h-5" />,
          },
          {
            title: "My Profile",
            href: "/dashboard/profile",
            icon: <User className="w-5 h-5" />,
          },
          {
            title: "My Requests",
            href: "/dashboard/requests",
            icon: <FileText className="w-5 h-5" />,
          },
          {
            title: "Find Services",
            href: "/services",
            icon: <Search className="w-5 h-5" />,
          },
          {
            title: "Find Freelancers",
            href: "/freelancers",
            icon: <Users className="w-5 h-5" />,
          },
          {
            title: "Projects",
            href: "/dashboard/projects",
            icon: <Briefcase className="w-5 h-5" />,
          },
          {
            title: "Messages",
            href: "/dashboard/messages",
            icon: <MessageSquare className="w-5 h-5" />,
          },
          {
            title: "Settings",
            href: "/dashboard/settings",
            icon: <Settings className="w-5 h-5" />,
          },
        ]

  return (
    <nav className="grid items-start gap-2 px-2 pt-2 pl-3.5">
      {navItems.map((item, index) => (
        <Link key={index} href={item.href}>
          <span
            className={cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              pathname === item.href ? "bg-accent" : "transparent",
            )}
          >
            <span className="mr-2">{item.icon}</span>
            <span>{item.title}</span>
          </span>
        </Link>
      ))}
    </nav>
  )
}

