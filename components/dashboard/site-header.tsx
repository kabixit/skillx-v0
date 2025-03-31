import Link from "next/link"

import { MobileNav } from "@/components/dashboard/mobile-nav"
import { UserAccountNav } from "@/components/dashboard/user-account-nav"
import { ModeToggle } from "@/components/mode-toggle"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { SearchBar } from "@/components/search-bar"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 justify-between">
        <Link href="/" className="font-bold text-xl">
          SkillX
        </Link>
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <SearchBar />
        </div>
        <div className="flex items-center space-x-4">
          <NotificationBell />
          <ModeToggle />
          <UserAccountNav />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}

