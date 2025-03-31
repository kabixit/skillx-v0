"use client"

import { useEffect, useState } from "react"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { Review } from "@/types/service"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StarRating } from "@/components/reviews/star-rating"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

interface ReviewsListProps {
  serviceId: string
}

export function ReviewsList({ serviceId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: [0, 0, 0, 0, 0],
  })

  useEffect(() => {
    async function fetchReviews() {
      try {
        const reviewsQuery = query(
          collection(db, "reviews"),
          where("serviceId", "==", serviceId),
          orderBy("createdAt", "desc"),
        )

        const querySnapshot = await getDocs(reviewsQuery)

        const reviewsData: Review[] = []
        querySnapshot.forEach((doc) => {
          reviewsData.push({ id: doc.id, ...doc.data() } as Review)
        })

        setReviews(reviewsData)

        // Calculate stats
        if (reviewsData.length > 0) {
          const total = reviewsData.length
          const sum = reviewsData.reduce((acc, review) => acc + review.rating, 0)
          const average = sum / total

          // Calculate distribution
          const distribution = [0, 0, 0, 0, 0]
          reviewsData.forEach((review) => {
            distribution[review.rating - 1]++
          })

          setStats({
            average,
            total,
            distribution,
          })
        }
      } catch (error) {
        console.error("Error fetching reviews:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchReviews()
  }, [serviceId])

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ""

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return formatDistanceToNow(date, { addSuffix: true })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        </div>
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (reviews.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No reviews yet. Be the first to leave a review!</div>
  }

  return (
    <div className="space-y-8">
      {/* Review Stats */}
      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <div className="space-y-2 text-center md:text-left">
          <div className="text-4xl font-bold">{stats.average.toFixed(1)}</div>
          <div className="flex justify-center md:justify-start">
            <StarRating rating={Math.round(stats.average)} readOnly />
          </div>
          <div className="text-sm text-muted-foreground">{stats.total} reviews</div>
        </div>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.distribution[rating - 1]
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0

            return (
              <div key={rating} className="flex items-center gap-2">
                <div className="text-sm w-3">{rating}</div>
                <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                </div>
                <div className="text-sm text-muted-foreground w-8">{count}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <Avatar>
                  <AvatarImage src={review.reviewerAvatar || ""} alt={review.reviewerName} />
                  <AvatarFallback>
                    {review.reviewerName ? review.reviewerName.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{review.reviewerName}</div>
                  <div className="flex items-center space-x-2">
                    <StarRating rating={review.rating} readOnly size={16} />
                    <span className="text-sm text-muted-foreground">{formatDate(review.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-sm">{review.comment}</div>

            {/* Seller Response */}
            {review.response && (
              <div className="bg-muted p-4 rounded-md mt-2">
                <div className="font-medium text-sm mb-1">Seller Response</div>
                <div className="text-sm">{review.response.comment}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatDate(review.response.createdAt)}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

