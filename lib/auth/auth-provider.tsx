"use client"

import { useRouter, usePathname } from "next/navigation"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "../firebase/config"

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
  role: string
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
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser)

      if (authUser) {
        try {
          const userDocRef = doc(db, "users", authUser.uid)
          const userDoc = await getDoc(userDocRef)

          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData)
            console.log("User data:", userDoc.data())

            // ✅ Redirect away from sign-in page if authenticated
            if (pathname === "/sign-in" || pathname === "/sign-up") {
              router.push("/dashboard")
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      } else {
        setUserData(null)

        // ✅ Redirect to sign-in if trying to access protected pages
        if (pathname.startsWith("/dashboard")) {
          router.push("/sign-in")
        }
      }

      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [pathname, router])

  return <AuthContext.Provider value={{ user, userData, isLoading }}>{children}</AuthContext.Provider>
}
