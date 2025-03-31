"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "../firebase/config"
import type { UserRole } from "@/types/user"

interface AuthContextType {
  user: User | null
  userData: UserData | null
  isLoading: boolean
}

export interface UserData {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
  role: UserRole
  createdAt: number
  credits: number
  isEmailVerified: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  isLoading: true,
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthContextType>({
    user: null,
    userData: null,
    isLoading: true,
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        console.log("No authenticated user found.")
        setState({ user: null, userData: null, isLoading: false })
        return
      }

      try {
        const userDocRef = doc(db, "users", authUser.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data() as UserData
          console.log("User authenticated:", userData)
          setState({ user: authUser, userData, isLoading: false })
        } else {
          console.warn("User document not found in Firestore for UID:", authUser.uid)
          setState({ user: authUser, userData: null, isLoading: false })
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setState({ user: authUser, userData: null, isLoading: false })
      }
    })

    return () => unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
