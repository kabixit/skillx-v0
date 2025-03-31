"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import type { Service } from "@/types/service"
import { Edit, MoreHorizontal, Pause, Play, Plus, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) return

    async function fetchServices() {
      try {
        const servicesQuery = query(collection(db, "services"), where("userId", "==", user.uid))
        const querySnapshot = await getDocs(servicesQuery)

        const servicesData: Service[] = []
        querySnapshot.forEach((doc) => {
          servicesData.push({ id: doc.id, ...doc.data() } as Service)
        })

        setServices(servicesData)
      } catch (error) {
        console.error("Error fetching services:", error)
        toast({
          title: "Error",
          description: "Failed to load your services",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchServices()
  }, [user, toast])

  const toggleServiceStatus = async (serviceId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "paused" : "active"
      await updateDoc(doc(db, "services", serviceId), {
        status: newStatus,
        updatedAt: new Date(),
      })

      // Update local state
      setServices(
        services.map((service) =>
          service.id === serviceId ? { ...service, status: newStatus as "active" | "paused" | "draft" } : service,
        ),
      )

      toast({
        title: "Service updated",
        description: `Service has been ${newStatus === "active" ? "activated" : "paused"}`,
      })
    } catch (error) {
      console.error("Error updating service:", error)
      toast({
        title: "Error",
        description: "Failed to update service status",
        variant: "destructive",
      })
    }
  }

  const deleteService = async () => {
    if (!serviceToDelete) return

    try {
      await deleteDoc(doc(db, "services", serviceToDelete))

      // Update local state
      setServices(services.filter((service) => service.id !== serviceToDelete))

      toast({
        title: "Service deleted",
        description: "Your service has been deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting service:", error)
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      })
    } finally {
      setServiceToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Services</h1>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-[100px] bg-muted"></CardHeader>
              <CardContent className="py-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Services</h1>
        <Button asChild>
          <Link href="/dashboard/services/create">
            <Plus className="mr-2 h-4 w-4" /> Create New Service
          </Link>
        </Button>
      </div>

      {services.length === 0 ? (
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>No Services Yet</CardTitle>
            <CardDescription>You haven't created any services yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Create your first service to start offering your skills to potential clients.</p>
            <Button asChild>
              <Link href="/dashboard/services/create">
                <Plus className="mr-2 h-4 w-4" /> Create Your First Service
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
                )}
                <Badge
                  className="absolute top-2 right-2"
                  variant={service.status === "active" ? "default" : "secondary"}
                >
                  {service.status === "active" ? "Active" : "Paused"}
                </Badge>
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-1">{service.title}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/services/edit/${service.id}`)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleServiceStatus(service.id, service.status)}>
                        {service.status === "active" ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" /> Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog
                        open={serviceToDelete === service.id}
                        onOpenChange={(open) => !open && setServiceToDelete(null)}
                      >
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault()
                              setServiceToDelete(service.id)
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this service. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={deleteService}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="text-sm">
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
                  <Link href={`/services/${service.id}`}>View Details</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

