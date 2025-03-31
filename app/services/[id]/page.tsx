"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { db } from "@/lib/firebase/config"
import type { Service } from "@/types/service"
import type { UserData } from "@/lib/auth/auth-provider"
import { useAuth } from "@/lib/auth/auth-provider"
import { Loader2, Clock, RotateCcw, CheckCircle, ArrowLeft } from "lucide-react"
import { ServiceRequestForm } from "@/components/services/service-request-form"

export default function ServiceDetailPage({ params }: { params: { id: string } }) {
  const [service, setService] = useState<Service | null>(null)
  const [serviceOwner, setServiceOwner] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const { user, userData } = useAuth()
  const router = useRouter()
  const { id } = params

  useEffect(() => {
    async function fetchServiceDetails() {
      try {
        const serviceDoc = await getDoc(doc(db, "services", id))

        if (!serviceDoc.exists()) {
          router.push("/services")
          return
        }

        const serviceData = { id: serviceDoc.id, ...serviceDoc.data() } as Service
        setService(serviceData)

        // Fetch service owner details
        const ownerDoc = await getDoc(doc(db, "users", serviceData.userId))
        if (ownerDoc.exists()) {
          setServiceOwner(ownerDoc.data() as UserData)
        }
      } catch (error) {
        console.error("Error fetching service details:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchServiceDetails()
  }, [id, router])

  if (isLoading) {
    return (
      <div className="container py-12 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Loading service details...</h2>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="container py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Service not found</h2>
          <p className="text-muted-foreground mb-6">
            The service you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push("/services")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Services
          </Button>
        </div>
      </div>
    )
  }

  const isOwnService = user?.uid === service.userId
  const isClient = userData?.role === "client"

  return (
    <div className="container py-8">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/services")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Services
      </Button>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <div>
          {/* Service Images */}
          <div className="mb-6">
            {service.images && service.images.length > 0 ? (
              <>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-2">
                  <img
                    src={service.images[activeImageIndex] || "/placeholder.svg"}
                    alt={service.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                {service.images.length > 1 && (
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {service.images.map((image, index) => (
                      <div
                        key={index}
                        className={`w-20 h-20 rounded-md overflow-hidden cursor-pointer border-2 ${
                          index === activeImageIndex ? "border-primary" : "border-transparent"
                        }`}
                        onClick={() => setActiveImageIndex(index)}
                      >
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`Thumbnail ${index}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">No images available</p>
              </div>
            )}
          </div>

          {/* Service Details */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="secondary">{service.category}</Badge>
              <Badge variant="outline">{service.subcategory}</Badge>
            </div>
            <h1 className="text-3xl font-bold mb-4">{service.title}</h1>

            <Tabs defaultValue="description" className="mt-6">
              <TabsList>
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="mt-4">
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-line">{service.description}</p>
                </div>
              </TabsContent>
              <TabsContent value="requirements" className="mt-4">
                <h3 className="text-lg font-semibold mb-3">What I need from you</h3>
                {service.requirements && service.requirements.length > 0 ? (
                  <ul className="space-y-2">
                    {service.requirements.map((req, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No specific requirements listed.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Skills */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {service.skills.map((skill, index) => (
                <Badge key={index} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Service Pricing Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>${service.price.amount}</span>
                <span className="text-base font-normal text-muted-foreground">per {service.price.unit}</span>
              </CardTitle>
              <CardDescription>
                {service.deliveryTime} day{service.deliveryTime !== 1 && "s"} delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>
                  {service.deliveryTime} day{service.deliveryTime !== 1 && "s"} delivery
                </span>
              </div>
              <div className="flex items-center">
                <RotateCcw className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>
                  {service.revisions} revision{service.revisions !== 1 && "s"}
                </span>
              </div>
            </CardContent>
            <CardFooter>
              {isOwnService ? (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/services/edit/${service.id}`)}
                >
                  Edit Your Service
                </Button>
              ) : (
                <Button className="w-full" onClick={() => setShowRequestForm(true)} disabled={!user || !isClient}>
                  Request This Service
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Service Provider Card */}
          {serviceOwner && (
            <Card>
              <CardHeader>
                <CardTitle>About the Seller</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={serviceOwner.photoURL || ""} alt={serviceOwner.displayName || "User"} />
                    <AvatarFallback>
                      {serviceOwner.displayName ? serviceOwner.displayName.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{serviceOwner.displayName}</h3>
                    <p className="text-sm text-muted-foreground">Freelancer</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/freelancers/${service.userId}`)}
                >
                  View Profile
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Service Request Form Modal */}
      {showRequestForm && (
        <ServiceRequestForm service={service} serviceOwner={serviceOwner} onClose={() => setShowRequestForm(false)} />
      )}
    </div>
  )
}

