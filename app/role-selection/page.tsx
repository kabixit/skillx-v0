"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/firebase/config"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-provider"
import type { UserRole } from "@/types/user"

export default function RoleSelectionPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  async function selectRole(role: UserRole) {
    if (!user) return
    setIsLoading(true)

    try {
      // Create the user document in Firestore with the selected role
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role: role,
        createdAt: serverTimestamp(),
        credits: 100, // Starting credits
        isEmailVerified: user.emailVerified,
      })

      toast({
        title: "Role selected!",
        description: `You're now registered as a ${role}`,
      })

      // Navigate to onboarding
      router.push(`/onboarding/${role}`)
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Failed to set role",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-bold">Choose Your Role</h1>
          <p className="text-muted-foreground">Select how you want to use SkillX</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => selectRole("freelancer")}
          >
            <CardHeader>
              <CardTitle>Freelancer</CardTitle>
              <CardDescription>I want to offer my skills and services</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-4 space-y-2">
                <li>Create a professional profile</li>
                <li>Offer your services to clients</li>
                <li>Exchange skills with other freelancers</li>
                <li>Build your portfolio and reputation</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" disabled={isLoading}>
                Join as Freelancer
              </Button>
            </CardFooter>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => selectRole("client")}>
            <CardHeader>
              <CardTitle>Client</CardTitle>
              <CardDescription>I want to find talented people for my projects</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-4 space-y-2">
                <li>Post service requests</li>
                <li>Find the perfect match for your projects</li>
                <li>Manage projects and deliverables</li>
                <li>Build relationships with skilled professionals</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" disabled={isLoading}>
                Join as Client
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

