"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import type { ServiceRequest } from "@/types/service"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StarRating } from "@/components/reviews/star-rating"

const formSchema = z.object({
  rating: z.number().min(1, "Please provide a rating").max(5),
  comment: z.string().min(10, "Please provide a comment of at least 10 characters").max(1000, "Comment is too long"),
})

interface ReviewFormProps {
  request: ServiceRequest
  onClose: () => void
  onSuccess?: () => void
}

export function ReviewForm({ request, onClose, onSuccess }: ReviewFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { user, userData } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rating: 0,
      comment: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !userData) return

    setIsLoading(true)
    try {
      // Create the review document
      const reviewData = {
        serviceId: request.serviceId,
        requestId: request.id,
        reviewerId: user.uid,
        reviewerName: userData.displayName,
        reviewerAvatar: userData.photoURL,
        freelancerId: request.serviceOwnerId,
        rating: values.rating,
        comment: values.comment,
        createdAt: serverTimestamp(),
      }

      const reviewRef = await addDoc(collection(db, "reviews"), reviewData)

      // Update the request with the review ID
      await updateDoc(doc(db, "requests", request.id), {
        reviewId: reviewRef.id,
      })

      // Update the service with the new rating
      // First, get all reviews for this service
      const reviewsQuery = collection(db, "reviews")
      const reviewsSnapshot = await fetch(`/api/services/${request.serviceId}/reviews`)
      const reviewsData = await reviewsSnapshot.json()

      // Calculate the new average rating
      const totalRating = reviewsData.reduce((acc: number, review: any) => acc + review.rating, 0)
      const averageRating = totalRating / reviewsData.length

      // Update the service document
      await updateDoc(doc(db, "services", request.serviceId), {
        averageRating,
        totalReviews: reviewsData.length,
      })

      toast({
        title: "Review submitted!",
        description: "Thank you for your feedback",
      })

      // Close the form and refresh if needed
      onClose()
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Failed to submit review",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Leave a Review</DialogTitle>
          <DialogDescription>
            Share your experience with this service to help other users make informed decisions.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating</FormLabel>
                  <FormControl>
                    <StarRating rating={field.value} onChange={field.onChange} size={32} />
                  </FormControl>
                  <FormDescription>Rate your overall experience with this service</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Review</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your experience with this service..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide details about your experience, what you liked, and any suggestions for improvement
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  "Submit Review"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

