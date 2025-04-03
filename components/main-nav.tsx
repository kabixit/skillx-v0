"use client"

import { useState } from "react"
import type React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Menu Button (only shows on small screens) */}
      <div className="md:hidden flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <Link href="/" className="text-xl font-bold">
          SkillX
        </Link>
      </div>

      {/* Desktop Navigation (shows on medium screens and up) */}
      <nav 
        className={cn(
          "hidden md:flex items-center space-x-4 lg:space-x-6",
          className
        )}
        {...props}
      >
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

      {/* Mobile Navigation Menu (only shows on small screens when toggled) */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-background border-b z-50 p-4 space-y-2">
          <Link 
            href="/explore" 
            className="block py-2 px-4 rounded-md hover:bg-accent"
            onClick={() => setIsOpen(false)}
          >
            Explore
          </Link>
          <Link 
            href="/services" 
            className="block py-2 px-4 rounded-md hover:bg-accent"
            onClick={() => setIsOpen(false)}
          >
            Services
          </Link>
          <Link 
            href="/freelancers" 
            className="block py-2 px-4 rounded-md hover:bg-accent"
            onClick={() => setIsOpen(false)}
          >
            Freelancers
          </Link>
          <Link 
            href="/projects" 
            className="block py-2 px-4 rounded-md hover:bg-accent"
            onClick={() => setIsOpen(false)}
          >
            Projects
          </Link>
          <Link 
            href="/about" 
            className="block py-2 px-4 rounded-md hover:bg-accent"
            onClick={() => setIsOpen(false)}
          >
            About
          </Link>
        </div>
      )}
    </>
  )
}