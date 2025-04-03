"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { useAuth } from "@/lib/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

export default function ProfileEditPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    bio: "",
    location: "",
    website: "",
    skills: ""
  })

  // Load existing profile data
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        try {
          const profileRef = doc(db, "profiles", user.uid)
          const profileSnap = await getDoc(profileRef)

          if (profileSnap.exists()) {
            const profileData = profileSnap.data()
            setFormData({
              bio: profileData.bio || "",
              location: profileData.location || "",
              website: profileData.website || "",
              skills: profileData.skills?.join(", ") || ""
            })
          }
        } catch (error) {
          console.error("Error fetching profile:", error)
        }
      }

      fetchProfile()
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    try {
      const profileRef = doc(db, "profiles", user.uid)
      await setDoc(profileRef, {
        ...formData,
        skills: formData.skills.split(",").map(skill => skill.trim())
      }, { merge: true })

      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      })
      router.push("/profile")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Could not update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.photoURL || ""} />
            <AvatarFallback>
              {user?.displayName?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <Button variant="outline" type="button">
            Change Photo
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="bio" className="block mb-2 font-medium">About You</label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
              className="min-h-[120px]"
            />
          </div>

          <div>
            <label htmlFor="location" className="block mb-2 font-medium">Location</label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="City, Country"
            />
          </div>

          <div>
            <label htmlFor="website" className="block mb-2 font-medium">Website</label>
            <Input
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div>
            <label htmlFor="skills" className="block mb-2 font-medium">Skills</label>
            <Input
              id="skills"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="Separate skills with commas (e.g., Web Design, Graphic Design)"
            />
            <p className="text-sm text-muted-foreground mt-2">Example: JavaScript, React, UI Design</p>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.push("/profile")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}