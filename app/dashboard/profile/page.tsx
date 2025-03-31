"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import { Skeleton } from "@/components/ui/skeleton"
import type { Profile as UserProfile } from "@/types/user"

export default function ProfilePage() {
  const { user, userData, isLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const router = useRouter()

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
              {/* Verification Badge (if applicable) */}
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
                  <CardHeader>
                    <CardTitle>Certifications</CardTitle>
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
                            <p className="text-xs text-muted-foreground">
                              Issued: {cert.issueDate}
                              {cert.expiryDate && ` • Expires: ${cert.expiryDate}`}
                            </p>
                            {cert.credentialUrl && (
                              <a
                                href={cert.credentialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 text-xs text-blue-600 hover:underline inline-block"
                              >
                                View Credential
                              </a>
                            )}
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

