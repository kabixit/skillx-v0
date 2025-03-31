"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { doc, setDoc } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-provider"
import { db } from "@/lib/firebase/config"

const formSchema = z.object({
  title: z.string().min(2).max(100),
  bio: z.string().min(10).max(1000),
  skills: z.string().min(2),
  location: z.string().min(2).max(100),
  website: z.string().url().optional().or(z.literal("")),
  hourlyRate: z.string().regex(/^\d+$/).optional().or(z.literal("")),
  availability: z.enum(["available", "limited", "unavailable"]),
})

export default function FreelancerOnboarding() {
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      bio: "",
      skills: "",
      location: "",
      website: "",
      hourlyRate: "",
      availability: "available",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return

    setIsLoading(true)
    try {
      // Convert hourlyRate from string to number
      const hourlyRate = values.hourlyRate ? Number.parseInt(values.hourlyRate) : undefined

      // Create skills array from comma-separated string
      const skillsArray = values.skills.split(",").map((skill) => skill.trim())

      // Create the freelancer profile document
      await setDoc(doc(db, "profiles", user.uid), {
        uid: user.uid,
        title: values.title,
        bio: values.bio,
        skills: skillsArray,
        location: values.location,
        website: values.website || null,
        hourlyRate,
        availability: values.availability,
        languages: [],
        education: [],
        certifications: [],
      })

      toast({
        title: "Profile created!",
        description: "Your freelancer profile has been set up successfully",
      })

      // Navigate to dashboard
      router.push("/dashboard")
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Failed to create profile",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex min-h-screen items-center justify-center py-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Set Up Your Freelancer Profile</CardTitle>
          <CardDescription>Complete your profile to start offering your services on SkillX</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professional Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Full-Stack Developer, Graphic Designer" {...field} />
                    </FormControl>
                    <FormDescription>Your professional title that describes what you do</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about yourself, your experience, and what you're passionate about..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>A brief description of yourself and your professional background</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skills</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. JavaScript, React, UI/UX Design" {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated list of your professional skills</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. New York, USA" {...field} />
                      </FormControl>
                      <FormDescription>Your city and country</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourwebsite.com" {...field} />
                      </FormControl>
                      <FormDescription>Your personal or portfolio website</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 25" {...field} />
                      </FormControl>
                      <FormDescription>Your hourly rate in USD</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Availability</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your availability" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">Available - Open to new projects</SelectItem>
                        <SelectItem value="limited">Limited - Only taking on select projects</SelectItem>
                        <SelectItem value="unavailable">Unavailable - Not accepting new projects</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Your current availability for new projects</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating Profile..." : "Create Profile"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center space-y-2">
          <p className="text-sm text-muted-foreground">You can always update your profile later</p>
          <Button variant="link" className="text-sm" onClick={() => router.push("/dashboard")}>
            Skip for now
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

