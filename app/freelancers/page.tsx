"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
} from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { db } from "@/lib/firebase/config"
import { Search, Loader2, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Freelancer {
  uid: string
  displayName: string
  email: string
  photoURL: string | null
  createdAt: Date
  skills?: string[]
  bio?: string
  rating?: number
  completedJobs?: number
}

export default function FreelancersPage() {
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(() => {
    fetchFreelancers()
  }, [])

  async function fetchFreelancers(isLoadMore = false) {
    if (isLoadMore) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
      setLastVisible(null)
    }

    try {
      let freelancersQuery = query(
        collection(db, "users"),
        where("role", "==", "freelancer"),
        orderBy("createdAt", "desc"),
        limit(12)
      )

      // If loading more, start after the last visible document
      if (isLoadMore && lastVisible) {
        freelancersQuery = query(freelancersQuery, startAfter(lastVisible))
      }

      const querySnapshot = await getDocs(freelancersQuery)

      // Set the last visible document for pagination
      const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1]
      setLastVisible(lastVisibleDoc || null)

      // Check if there are more results
      setHasMore(querySnapshot.docs.length === 12)

      const freelancersData: Freelancer[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        freelancersData.push({
          uid: doc.id,
          displayName: data.displayName,
          email: data.email,
          photoURL: data.photoURL,
          createdAt: data.createdAt.toDate(),
          skills: data.skills || [],
          bio: data.bio || "",
          rating: data.rating || 0,
          completedJobs: data.completedJobs || 0,
        })
      })

      if (isLoadMore) {
        setFreelancers((prev) => [...prev, ...freelancersData])
      } else {
        setFreelancers(freelancersData)
      }
    } catch (error) {
      console.error("Error fetching freelancers:", error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchFreelancers()
  }

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore) {
      fetchFreelancers(true)
    }
  }

  const filteredFreelancers = freelancers.filter((freelancer) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      freelancer.displayName.toLowerCase().includes(searchLower) ||
      freelancer.email.toLowerCase().includes(searchLower) ||
      (freelancer.bio && freelancer.bio.toLowerCase().includes(searchLower)) ||
      (freelancer.skills && freelancer.skills.some((skill) => skill.toLowerCase().includes(searchLower)))
    )
  })

  return (
    <div className="container py-8 pr-8 pl-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Find Freelancers</h1>
        <p className="text-muted-foreground">Connect with skilled professionals for your projects</p>
      </div>

      <div className="space-y-6">
        <div className="max-w-md">
          <form onSubmit={handleSearch} className="flex space-x-2">
            <Input
              placeholder="Search freelancers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button type="submit" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array(8)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center space-y-4">
                      <Skeleton className="h-24 w-24 rounded-full" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-10 w-full mt-4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : filteredFreelancers.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">No freelancers found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your search</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                fetchFreelancers()
              }}
            >
              Reset Search
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredFreelancers.map((freelancer) => (
                <Card key={freelancer.uid} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center space-y-4 text-center">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={freelancer.photoURL || ""} />
                        <AvatarFallback>
                          <User className="h-12 w-12" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h3 className="font-semibold text-lg">{freelancer.displayName}</h3>
                        <p className="text-sm text-muted-foreground">{freelancer.email}</p>
                      </div>
                      
                      {freelancer.bio && (
                        <p className="text-sm line-clamp-2">{freelancer.bio}</p>
                      )}
                      
                      {freelancer.skills && freelancer.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center">
                          {freelancer.skills.slice(0, 3).map((skill) => (
                            <Badge key={skill} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                          {freelancer.skills.length > 3 && (
                            <Badge variant="outline">+{freelancer.skills.length - 3} more</Badge>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-4 text-sm w-full justify-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold">{freelancer.rating?.toFixed(1) || "N/A"}</span>
                          <span className="text-muted-foreground">Rating</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="font-bold">{freelancer.completedJobs || 0}</span>
                          <span className="text-muted-foreground">Jobs</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-center p-4">
                    <Link href={`/freelancers/${freelancer.uid}`} passHref>
                      <Button className="w-full">View Profile</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 text-center">
                <Button onClick={handleLoadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}