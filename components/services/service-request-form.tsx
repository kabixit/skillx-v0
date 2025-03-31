"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { getDownloadURL, ref, uploadBytes } from "firebase/storage"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-provider"
import { db, storage } from "@/lib/firebase/config"
import type { Service } from "@/types/service"
import type { UserData } from "@/lib/auth/auth-provider"
import { Loader2, X } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const formSchema = z.object({
  requirements: z.string().min(20, "Please provide detailed requirements").max(2000, "Requirements are too long"),
  timeline: z.string().regex(/^\d+$/, "Please enter a valid number of days"),
  budget: z.string().regex(/^\d+(\.\d{1,2})?$/, "Please enter a valid budget"),
})

interface ServiceRequestFormProps {
  service: Service
  serviceOwner: UserData | null
  onClose: () => void
}

export function ServiceRequestForm({ service, serviceOwner, onClose }: ServiceRequestFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const { user, userData } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requirements: "",
      timeline: service.deliveryTime.toString(),
      budget: service.price.amount.toString(),
    },
  })

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      if (attachments.length + newFiles.length <= 5) {
        setAttachments([...attachments, ...newFiles])
      } else {
        toast({
          title: "Too many files",
          description: "You can upload a maximum of 5 files",
          variant: "destructive",
        })
      }
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  async function uploadAttachments() {
    if (attachments.length === 0) return []

    const attachmentUrls: string[] = []

    try {
      for (const file of attachments) {
        const storageRef = ref(storage, `requests/${user?.uid}/${Date.now()}_${file.name}`)
        const snapshot = await uploadBytes(storageRef, file)
        const url = await getDownloadURL(snapshot.ref)
        attachmentUrls.push(url)
      }
      return attachmentUrls
    } catch (error) {
      console.error("Error uploading attachments:", error)
      throw error
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !userData) return

    setIsLoading(true)
    try {
      // Upload attachments first
      const attachmentUrls = await uploadAttachments()

      // Create the service request document
      const requestData = {
        serviceId: service.id,
        serviceName: service.title,
        serviceOwnerId: service.userId,
        clientId: user.uid,
        clientName: userData.displayName,
        requirements: values.requirements,
        timeline: Number.parseInt(values.timeline),
        budget: Number.parseFloat(values.budget),
        attachments: attachmentUrls,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const requestRef = await addDoc(collection(db, "requests"), requestData)

      toast({
        title: "Request submitted!",
        description: "Your service request has been sent to the freelancer",
      })

      // Close the form and navigate to requests
      onClose()
      router.push("/dashboard/requests")
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Failed to submit request",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Service</DialogTitle>
          <DialogDescription>
            Provide details about your project requirements to request this service from{" "}
            {serviceOwner?.displayName || "the freelancer"}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center space-x-4 mb-6 p-3 bg-muted rounded-md">
            <div className="shrink-0 w-16 h-16 bg-background rounded-md overflow-hidden">
              {service.images && service.images.length > 0 ? (
                <img
                  src={service.images[0] || "/placeholder.svg"}
                  alt={service.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
              )}
            </div>
            <div>
              <h3 className="font-medium">{service.title}</h3>
              <p className="text-sm text-muted-foreground">
                ${service.price.amount} per {service.price.unit}
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Requirements</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your project requirements in detail..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Be specific about what you need, including any preferences, deadlines, or special requirements
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="timeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timeline (days)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormDescription>How many days you need this completed in</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget ($)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>Your budget for this service</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormLabel>Attachments (Optional)</FormLabel>
                <div className="mt-2">
                  <Input type="file" onChange={handleAttachmentChange} multiple disabled={attachments.length >= 5} />
                  <FormDescription>Upload up to 5 files (max 5MB each)</FormDescription>
                </div>
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm truncate max-w-[80%]">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

