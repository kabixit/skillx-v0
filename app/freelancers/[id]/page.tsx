"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StarRating } from "@/components/reviews/star-rating"
import { ReviewsList } from "@/components/reviews/reviews-list"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import type { Service, Portfolio, Review } from "@/types/service"
import type { UserData } from "@/lib/auth/auth-provider"
import type { Profile } from "@/types/user"
import { Loader2, ArrowLeft, Mail, Calendar, MapPin, Globe, Clock, DollarSign } from "lucide-react"

export default function FreelancerProfilePage({ params }: { params: { id: string } }) {
  const [freelancer, setFreelancer] = useState<UserData | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [portfolioItems, setPortfolioItems] = useState<Portfolio[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    completedOrders: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { id } = params

  useEffect(() => {
    async function fetchFreelancerData() {
      try {
        // Fetch freelancer user data
        const userDoc = await getDoc(doc(db, "users", id))

        if (!userDoc.exists()) {
          router.push("/freelancers")
          return
        }

        const userData = userDoc.data() as UserData
        setFreelancer(userData)

        // Fetch freelancer profile
        const profileDoc = await getDoc(doc(db, "profiles", id))
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as Profile)
        }

        // Fetch freelancer services
        const servicesQuery = query(
          collection(db, "services"),
          where("userId", "==", id),
          where("status", "==", "active"),
        )

        const servicesSnapshot = await getDocs(servicesQuery)
        const servicesData: Service[] = []
        servicesSnapshot.forEach((doc) => {
          servicesData.push({ id: doc.id, ...doc.data() } as Service)
        })
        setServices(servicesData)

        // Fetch freelancer portfolio
        const portfolioQuery = query(collection(db, "portfolio"), where("userId", "==", id))

        const portfolioSnapshot = await getDocs(portfolioQuery)
        const portfolioData: Portfolio[] = []
        portfolioSnapshot.forEach((doc) => {
          portfolioData.push({ id: doc.id, ...doc.data() } as Portfolio)
        })
        setPortfolioItems(portfolioData)

        // Fetch freelancer reviews
        const reviewsQuery = query(
          collection(db, "reviews"),
          where("freelancerId", "==", id),
          orderBy("createdAt", "desc"),
        )

        const reviewsSnapshot = await getDocs(reviewsQuery)
        const reviewsData: Review[] = []
        reviewsSnapshot.forEach((doc) => {
          reviewsData.push({ id: doc.id, ...doc.data() } as Review)
        })
        setReviews(reviewsData)

        // Calculate stats
        if (reviewsData.length > 0) {
          const totalRating = reviewsData.reduce((acc, review) => acc + review.rating, 0)
          const averageRating = totalRating / reviewsData.length

          setStats({
            averageRating,
            totalReviews: reviewsData.length,
            completedOrders: reviewsData.length, // Simplified, in a real app you'd count completed orders
          })
        }
      } catch (error) {
        console.error("Error fetching freelancer data:", error)
        toast({
          title: "Error",
          description: "Failed to load freelancer profile",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchFreelancerData()
  }, [id, router, toast])

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading freelancer profile...</span>
        </div>
      </div>
    )
  }

  if (!freelancer) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Freelancer not found</h2>
          <p className="text-muted-foreground mb-4">
            The freelancer you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push("/freelancers")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Freelancers
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/freelancers")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Freelancers
      </Button>

      <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Freelancer Card */}
          <Card>
            <CardHeader className="text-center">
              <div className="flex flex-col items-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={freelancer.photoURL || ""} alt={freelancer.displayName || "Freelancer"} />
                  <AvatarFallback className="text-2xl">
                    {freelancer.displayName ? freelancer.displayName.charAt(0).toUpperCase() : "F"}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-2xl">{freelancer.displayName}</CardTitle>
                <CardDescription className="text-lg">{profile?.title || "Freelancer"}</CardDescription>
                {stats.totalReviews > 0 && (
                  <div className="flex items-center mt-2">
                    <StarRating rating={Math.round(stats.averageRating)} readOnly size={16} />
                    <span className="ml-2 text-sm">
                      {stats.averageRating.toFixed(1)} ({stats.totalReviews} reviews)
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile?.location && (
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{profile.location}</span>
                </div>
              )}
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>Member since {new Date(freelancer.createdAt.seconds * 1000).toLocaleDateString()}</span>
              </div>
              {profile?.website && (
                <div className="flex items-center text-sm">
                  <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
              {stats.completedOrders > 0 && (
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{stats.completedOrders} orders completed</span>
                </div>
              )}
              {profile?.hourlyRate && (
                <div className="flex items-center text-sm">
                  <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>${profile.hourlyRate}/hour</span>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full" asChild>
                <a href={`/dashboard/messages?userId=${id}`}>
                  <Mail className="mr-2 h-4 w-4" /> Contact Me
                </a>
              </Button>
            </CardFooter>
          </Card>

          {/* Skills Card */}
          {profile?.skills && profile.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Languages Card */}
          {profile?.languages && profile.languages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Languages</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {profile.languages.map((language, index) => (
                    <li key={index} className="text-sm">
                      {language}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div>
          <Tabs defaultValue="about">
            <TabsList className="mb-6">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>About Me</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile?.bio ? (
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="whitespace-pre-line">{profile.bio}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No bio information provided.</p>
                  )}
                </CardContent>
              </Card>

              {profile?.education && profile.education.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Education</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}

              {profile?.certifications && profile.certifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Certifications</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="services" className="space-y-6">
              {services.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No services available at the moment.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {services.map((service) => (
                    <Card key={service.id} className="overflow-hidden">
                      <div className="aspect-video relative bg-muted">
                        {service.images && service.images.length > 0 ? (
                          <img
                            src={service.images[0] || "/placeholder.svg"}
                            alt={service.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg line-clamp-1">{service.title}</CardTitle>
                        <CardDescription>
                          {service.category} • {service.subcategory}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold">${service.price.amount}</span>
                            <span className="text-muted-foreground text-sm"> / {service.price.unit}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {service.deliveryTime} day{service.deliveryTime !== 1 && "s"} delivery
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" className="w-full" asChild>
                          <a href={`/services/${service.id}`}>View Details</a>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="portfolio" className="space-y-6">
              {portfolioItems.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No portfolio items available.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {portfolioItems.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="aspect-video relative bg-muted">
                        {item.images && item.images.length > 0 ? (
                          <img
                            src={item.images[0] || "/placeholder.svg"}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <CardDescription>{item.category}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
                      </CardContent>
                      {item.link && (
                        <CardFooter>
                          <Button variant="outline" className="w-full" asChild>
                            <a href={item.link} target="_blank" rel="noopener noreferrer">
                              View Project
                            </a>
                          </Button>
                        </CardFooter>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Client Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReviewsList serviceId={id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

