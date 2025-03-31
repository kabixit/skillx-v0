import type React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
      <Link href="/" className="text-xl font-bold flex items-center">
        <span>SkillX</span>
      </Link>
      <Link href="/explore" className="text-sm font-medium transition-colors hover:text-primary">
        Explore
      </Link>
      <Link href="/services" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        Services
      </Link>
      <Link
        href="/freelancers"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Freelancers
      </Link>
      <Link href="/projects" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        Projects
      </Link>
      <Link href="/about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        About
      </Link>
    </nav>
  )
}

