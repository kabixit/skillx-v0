"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import { Skeleton } from "@/components/ui/skeleton"
import type { Profile as UserProfile } from "@/types/user"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

// Updated valid certificate codes
const VALID_CERTIFICATES = {
  coursera: ["TKTYNBA77AB3", "ZACFTLVD2LQS","QSBAJET294WK","LN95738EPH2D","C8TF7WFY8DGB","2HSNXD4M5QTD"],
  udemy: ["UC-23cd5fbd-52b1-4c2b-b21b-c795fcecf3e7"],
  aws: ["AWSCERT1", "CLOUD202"],
  microsoft: ["MSFT123", "AZURE456"],
}

export default function ProfilePage() {
  const { user, userData, isLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  // Certificate form state
  const [isAddingCertificate, setIsAddingCertificate] = useState(false)
  const [certificateProvider, setCertificateProvider] = useState("")
  const [certificateCode, setCertificateCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/sign-in")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    async function loadProfile() {
      if (user) {
        try {
          const profileDocRef = doc(db, "profiles", user.uid)
          const profileDoc = await getDoc(profileDocRef)

          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as UserProfile)
          }
        } catch (error) {
          console.error("Error loading profile:", error)
        } finally {
          setIsProfileLoading(false)
        }
      }
    }

    loadProfile()
  }, [user])

  const handleAddCertificate = async () => {
    if (!certificateProvider || !certificateCode) {
      toast({
        title: "Error",
        description: "Please select a provider and enter your certificate code",
        variant: "destructive",
      })
      return
    }

    setIsVerifying(true)

    // Add slight delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000))

    try {
      // Check if the code is valid
      const validCodes = VALID_CERTIFICATES[certificateProvider as keyof typeof VALID_CERTIFICATES]
      const isValid = validCodes.includes(certificateCode.toUpperCase())

      if (!isValid) {
        toast({
          title: "Invalid Certificate",
          description: "Please enter a valid certificate code",
          variant: "destructive",
        })
        return
      }

      // Create new certificate object (simplified without issue date)
      const newCertificate = {
        name: `${certificateProvider.charAt(0).toUpperCase() + certificateProvider.slice(1)} Certification`,
        issuer: certificateProvider.charAt(0).toUpperCase() + certificateProvider.slice(1),
      }

      // Update profile with new certificate
      const profileDocRef = doc(db, "profiles", user!.uid)
      const currentCertificates = profile?.certifications || []

      await updateDoc(profileDocRef, {
        certifications: [...currentCertificates, newCertificate],
      })

      // Update local state
      setProfile((prev) => ({
        ...prev!,
        certifications: [...currentCertificates, newCertificate],
      }))

      // Show success toast
      toast({
        title: "Success",
        description: "Certificate verified and added successfully!",
        className: "bg-green-500 text-white",
      })

      // Reset form and close dialog after a short delay
      setTimeout(() => {
        setCertificateProvider("")
        setCertificateCode("")
        setIsAddingCertificate(false)
      }, 1000)
    } catch (error) {
      console.error("Error adding certificate:", error)
      toast({
        title: "Error",
        description: "Failed to add certificate. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  if (isLoading || !user || !userData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
          <p className="text-muted-foreground">Please wait while we load your profile</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
        <Button onClick={() => router.push("/dashboard/profile/edit")}>Edit Profile</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <div className="flex flex-col items-center space-y-4">
              <div className="relative h-24 w-24 rounded-full overflow-hidden">
                {user.photoURL ? (
                  <img
                    src={user.photoURL || "/placeholder.svg"}
                    alt={user.displayName || "User"}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-xl font-semibold uppercase">
                    {user.displayName ? user.displayName.charAt(0) : "U"}
                  </div>
                )}
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold">{user.displayName}</h3>
                <p className="text-sm text-muted-foreground">
                  {userData.role === "freelancer" ? "Freelancer" : "Client"}
                </p>
              </div>
              {userData.isEmailVerified && (
                <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 py-1 px-2 rounded-full text-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Verified</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">Skill Credits</h4>
                <p className="text-2xl font-bold">{userData.credits || 0}</p>
              </div>

              {isProfileLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : profile ? (
                <>
                  {userData.role === "freelancer" && (
                    <div>
                      <h4 className="text-sm font-medium">Availability</h4>
                      <p className="text-sm">{profile.availability || "Not set"}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium">Location</h4>
                    <p className="text-sm">{profile.location || "Not set"}</p>
                  </div>

                  {profile.website && (
                    <div>
                      <h4 className="text-sm font-medium">Website</h4>
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {profile.website}
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">Profile not set up yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.push(`/onboarding/${userData.role}`)}
                  >
                    Complete Profile
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="col-span-2">
          <Tabs defaultValue="about">
            <TabsList>
              <TabsTrigger value="about">About</TabsTrigger>
              {userData.role === "freelancer" && <TabsTrigger value="skills">Skills</TabsTrigger>}
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            </TabsList>
            <TabsContent value="about" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>About Me</CardTitle>
                </CardHeader>
                <CardContent>
                  {isProfileLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : profile?.bio ? (
                    <p>{profile.bio}</p>
                  ) : (
                    <p className="text-muted-foreground">No bio information provided yet.</p>
                  )}
                </CardContent>
              </Card>

              {userData.role === "freelancer" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Education</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isProfileLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : profile?.education && profile.education.length > 0 ? (
                      <div className="space-y-4">
                        {profile.education.map((edu, index) => (
                          <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                            <h4 className="font-medium">{edu.degree}</h4>
                            <p className="text-sm">{edu.institution}</p>
                            <p className="text-xs text-muted-foreground">
                              {edu.startYear} - {edu.current ? "Present" : edu.endYear}
                            </p>
                            {edu.description && <p className="mt-2 text-sm">{edu.description}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No education information provided yet.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {userData.role === "freelancer" && (
              <TabsContent value="skills" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isProfileLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : profile?.skills && profile.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill, index) => (
                          <div key={index} className="rounded-full bg-muted px-3 py-1 text-sm">
                            {skill}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No skills added yet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Certifications</CardTitle>
                      <CardDescription>Your professional certifications</CardDescription>
                    </div>
                    <Dialog open={isAddingCertificate} onOpenChange={setIsAddingCertificate}>
                      <DialogTrigger asChild>
                        <Button size="sm">Add Certificate</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Certificate</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="provider">Certificate Provider</Label>
                            <Select
                              value={certificateProvider}
                              onValueChange={setCertificateProvider}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="coursera">Coursera</SelectItem>
                                <SelectItem value="udemy">Udemy</SelectItem>
                                <SelectItem value="aws">AWS</SelectItem>
                                <SelectItem value="microsoft">Microsoft</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="code">Certificate Code</Label>
                            <Input
                              id="code"
                              placeholder="Enter your certificate code"
                              value={certificateCode}
                              onChange={(e) => setCertificateCode(e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">
                              Enter the verification code from your certificate
                            </p>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => setIsAddingCertificate(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleAddCertificate}
                              disabled={isVerifying || !certificateProvider || !certificateCode}
                            >
                              {isVerifying ? "Verifying..." : "Add Certificate"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    {isProfileLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : profile?.certifications && profile.certifications.length > 0 ? (
                      <div className="space-y-4">
                        {profile.certifications.map((cert, index) => (
                          <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                            <h4 className="font-medium">{cert.name}</h4>
                            <p className="text-sm">Issued by {cert.issuer}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No certifications added yet.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="portfolio" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio</CardTitle>
                  <CardDescription>Your work and completed projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No portfolio items added yet.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}