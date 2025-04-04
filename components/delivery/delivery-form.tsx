"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { doc, updateDoc, serverTimestamp, collection, addDoc } from "firebase/firestore"
import { getDownloadURL, ref, uploadBytes } from "firebase/storage"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-provider"
import { db, storage } from "@/lib/firebase/config"
import type { ServiceRequest } from "@/types/service"
import { Loader2, X, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const formSchema = z.object({
  message: z.string().min(10, "Please provide a delivery message").max(1000, "Message is too long"),
})

interface DeliveryFormProps {
  request: ServiceRequest
  onClose: () => void
  onSuccess?: () => void
}

export function DeliveryForm({ request, onClose, onSuccess }: DeliveryFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      if (deliveryFiles.length + newFiles.length <= 10) {
        setDeliveryFiles([...deliveryFiles, ...newFiles])
      } else {
        toast({
          title: "Too many files",
          description: "You can upload a maximum of 10 files",
          variant: "destructive",
        })
      }
    }
  }

  const removeFile = (index: number) => {
    setDeliveryFiles(deliveryFiles.filter((_, i) => i !== index))
  }

  async function uploadFiles() {
    if (deliveryFiles.length === 0) return []

    setUploadingFiles(true)
    const fileUrls: string[] = []

    try {
      for (const file of deliveryFiles) {
        const storageRef = ref(storage, `deliveries/${request.id}/${Date.now()}_${file.name}`)
        const snapshot = await uploadBytes(storageRef, file)
        const url = await getDownloadURL(snapshot.ref)
        fileUrls.push(url)
      }
      return fileUrls
    } catch (error) {
      console.error("Error uploading files:", error)
      throw error
    } finally {
      setUploadingFiles(false)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return

    setIsLoading(true)
    try {
      // Upload delivery files if any
      const fileUrls = deliveryFiles.length > 0 ? await uploadFiles() : []

      // Update the request status to delivered
      await updateDoc(doc(db, "requests", request.id), {
        status: "delivered",
        ...(fileUrls.length > 0 && { deliveryFiles: fileUrls }), // Only add deliveryFiles if there are any
        updatedAt: serverTimestamp(),
      })

      // Add a message to the conversation
      await addDoc(collection(db, "messages"), {
        requestId: request.id,
        senderId: user.uid,
        senderName: user.displayName,
        senderAvatar: user.photoURL,
        content: `🎉 Delivery: ${values.message}`,
        timestamp: serverTimestamp(),
      })

      // Create a notification for the client
      await addDoc(collection(db, "notifications"), {
        userId: request.clientId,
        title: "Order Delivered",
        message: `Your order for "${request.serviceName}" has been delivered!`,
        type: "request",
        read: false,
        createdAt: serverTimestamp(),
        linkTo: `/dashboard/requests/${request.id}`,
        relatedId: request.id,
      })

      toast({
        title: "Delivery submitted!",
        description: "Your delivery has been sent to the client",
      })

      // Close the form and refresh if needed
      onClose()
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Failed to submit delivery",
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
          <DialogTitle>Submit Delivery</DialogTitle>
          <DialogDescription>Submit your completed work to the client.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you're delivering and any instructions for the client..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide details about your delivery and any instructions for the client
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Delivery Files (Optional)</FormLabel>
              <div className="mt-2">
                <Input type="file" onChange={handleFileChange} multiple disabled={deliveryFiles.length >= 10} />
                <FormDescription>Upload up to 10 files (max 25MB each)</FormDescription>
              </div>
              {deliveryFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {deliveryFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex items-center">
                        <Upload className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm truncate max-w-[80%]">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
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
              <Button type="submit" disabled={isLoading || uploadingFiles}>
                {isLoading || uploadingFiles ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadingFiles ? "Uploading Files..." : "Submitting Delivery..."}
                  </>
                ) : (
                  "Submit Delivery"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}