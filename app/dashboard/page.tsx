"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-provider"

export default function Dashboard() {
  const router = useRouter()
  const { user, userData, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && (!user || !userData)) {
      console.log("User not authenticated, redirecting to sign-in")
      router.push("/sign-in")
    }
  }, [user, userData, isLoading, router])

  if (isLoading) return <p>Loading...</p>

  return (
    <div>
      <h1>Welcome, {userData?.displayName}</h1>
      <p>Your credits: {userData?.credits}</p>
    </div>
  )
}
