"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import type { ServiceRequest } from "@/types/service"
import type { UserData } from "@/lib/auth/auth-provider"
import {
  Loader2,
  ArrowLeft,
  Mail,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Download,
  MessageSquare,
  CheckCircle,
  XCircle,
} from "lucide-react"
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
import { ReviewForm } from "@/components/reviews/review-form"
import { PaymentForm } from "@/components/payments/payment-form"
import { DeliveryForm } from "@/components/delivery/delivery-form"

export default function RequestDetailPage() {
  const [request, setRequest] = useState<ServiceRequest | null>(null)
  const [otherParty, setOtherParty] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showDeliveryForm, setShowDeliveryForm] = useState(false)
  const { user, userData } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const params = useParams()
  const id = params?.id as string

  useEffect(() => {
    if (!user || !id) return

    async function fetchRequestDetails() {
      try {
        const requestDoc = await getDoc(doc(db, "requests", id))
        
        if (!requestDoc.exists()) {
          router.push("/dashboard/requests")
          return
        }

        const requestData = { id: requestDoc.id, ...requestDoc.data() } as ServiceRequest
        setRequest(requestData)

        // Check if the user is authorized to view this request
        if (userData?.role === "client" && requestData.clientId !== user.uid) {
          toast({
            title: "Unauthorized",
            description: "You don't have permission to view this request",
            variant: "destructive",
          })
          router.push("/dashboard/requests")
          return
        }

        if (userData?.role === "freelancer" && requestData.serviceOwnerId !== user.uid) {
          toast({
            title: "Unauthorized",
            description: "You don't have permission to view this request",
            variant: "destructive",
          })
          router.push("/dashboard/requests")
          return
        }

        // Fetch the other party's details
        const otherPartyId = userData?.role === "client" ? requestData.serviceOwnerId : requestData.clientId
        const otherPartyDoc = await getDoc(doc(db, "users", otherPartyId))
        
        if (otherPartyDoc.exists()) {
          setOtherParty(otherPartyDoc.data() as UserData)
        }
      } catch (error) {
        console.error("Error fetching request details:", error)
        toast({
          title: "Error",
          description: "Failed to load request details",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequestDetails()
  }, [id, user, userData, router, toast])

  const updateRequestStatus = async (newStatus: string) => {
    if (!request) return

    try {
      await updateDoc(doc(db, "requests", request.id), {
        status: newStatus,
        updatedAt: new Date(),
      })

      // Update local state
      setRequest({
        ...request,
        status: newStatus as any,
      })

      toast({
        title: "Request updated",
        description: `Request has been ${newStatus}`,
      })
    } catch (error) {
      console.error("Error updating request:", error)
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      })
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary"
      case "accepted":
      case "in_progress":
        return "default"
      case "completed":
        return "success"
      case "rejected":
      case "cancelled":
        return "destructive"
      case "delivered":
        return "warning"
      case "revision_requested":
        return "outline"
      default:
        return "outline"
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date)
  }

  const canLeaveReview = () => {
    if (!request || !userData) return false
    
    return (
      userData.role === "client" &&
      request.status === "completed" &&
      !request.reviewId
    )
  }

  const canMakePayment = () => {
    if (!request || !userData) return false
    
    return (
      userData.role === "client" &&
      (request.status === "accepted" || request.status === "in_progress") &&
      (!request.paymentStatus || request.paymentStatus === "pending")
    )
  }

  const canSubmitDelivery = () => {
    if (!request || !userData) return false
    
    return (
      userData.role === "freelancer" &&
      (request.status === "in_progress" || request.status === "revision_requested") &&
      request.paymentStatus === "paid"
    )
  }

  const canRequestRevision = () => {
    if (!request || !userData) return false
    
    return (
      userData.role === "client" &&
      request.status === "delivered"
    )
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading request details...</span>
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Request not found</h2>
          <p className="text-muted-foreground mb-4">The request you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push("/dashboard/requests")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Requests
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/dashboard/requests")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Requests
      </Button>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <div>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant={getStatusBadgeVariant(request.status)} className="mb-2">
                    {request.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </Badge>
                  <CardTitle>{request.serviceName}</CardTitle>
                  <CardDescription>
                    Request ID: {request.id}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Requested on {formatDate(request.createdAt)}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Timeline: {request.timeline} day{request.timeline !== 1 && 's'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Budget: ${request.budget}</span>
                </div>
                {request.paymentStatus && (
                  <div className="flex items-center text-sm">
                    <Badge variant={request.paymentStatus === "paid" ? "success" : "outline"}>
                      Payment: {request.paymentStatus.charAt(0).toUpperCase() + request.paymentStatus.slice(1)}
                    </Badge>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Requirements</h3>
                <div className="p-4 bg-muted rounded-md">
                  <p className="whitespace-pre-line">{request.requirements}</p>
                </div>
              </div>

              {request.attachments && request.attachments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Attachments</h3>
                  <div className="space-y-2">
                    {request.attachments.map((attachment, index) => {
                      const fileName = attachment.split('/').pop() || `File ${index + 1}`
                      return (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[200px]">{fileName}</span>
                          </div>
                          <a
                            href={attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-sm text-blue-600 hover:underline"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {request.deliveryFiles && request.deliveryFiles.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Delivery Files</h3>
                  <div className="space-y-2">
                    {request.deliveryFiles.map((file, index) => {
                      const fileName = file.split('/').pop() || `Delivery ${index + 1}`
                      return (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[200px]">{fileName}</span>
                          </div>
                          <a
                            href={file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-sm text-blue-600 hover:underline"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/messages?requestId=${request.id}`)}
              >
                <MessageSquare className="mr-2 h-4 w-4" /> Messages
              </Button>

              {/* Status update buttons based on role and current status */}
              {userData?.role === "freelancer" && request.status === "pending" && (
                <div className="flex space-x-2">
                  <Button
                    variant="default"
                    onClick={() => updateRequestStatus("accepted")}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Accept Request
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <XCircle className="mr-2 h-4 w-4" /> Decline Request
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will decline the client's request. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => updateRequestStatus("rejected")}>
                          Decline
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              {userData?.role === "client" && request.status === "pending" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <XCircle className="mr-2 h-4 w-4" /> Cancel Request
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel your request. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Request</AlertDialogCancel>
                      <AlertDialogAction onClick={() => updateRequestStatus("cancelled")}>
                        Cancel Request
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {canMakePayment() && (
                <Button
                  variant="default"
                  onClick={() => setShowPaymentForm(true)}
                >
                  <DollarSign className="mr-2 h-4 w-4" /> Make Payment
                </Button>
              )}

              {canSubmitDelivery() && (
                <Button
                  variant="default"
                  onClick={() => setShowDeliveryForm(true)}
                >
                  <FileText className="mr-2 h-4 w-4" /> Submit Delivery
                </Button>
              )}

              {canRequestRevision() && (
                <Button
                  variant="outline"
                  onClick={() => updateRequestStatus("revision_requested")}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Request Revision
                </Button>
              )}

              {request.status === "delivered" && userData?.role === "client" && (
                <Button
                  variant="default"
                  onClick={() => updateRequestStatus("completed")}
                >
                  <CheckCircle className="mr-2 h-4 w-4" /> Accept Delivery
                </Button>
              )}

              {canLeaveReview() && (
                <Button
                  variant="default"
                  onClick={() => setShowReviewForm(true)}
                >
                  <FileText className="mr-2 h-4 w-4" /> Leave Review
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Other Party Card */}
          {otherParty && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {userData?.role === "client" ? "Service Provider" : "Client"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={otherParty.photoURL || ""} alt={otherParty.displayName || "User"} />
                    <AvatarFallback>
                      {otherParty.displayName ? otherParty.displayName.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{otherParty.displayName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {userData?.role === "client" ? "Freelancer" : "Client"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/${userData?.role === "client" ? "freelancers" : "clients"}/${otherParty.uid}`)}
                >
                  View Profile
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/dashboard/messages?userId=${otherParty.uid}`)}
                >
                  <Mail className="mr-2 h-4 w-4" /> Send Message
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Service Card */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/services/${request.serviceId}`)}
              >
                View Service
              </Button>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Request Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="mr-4 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <span className="text-xs">1</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Request Created</h4>
                    <p className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start">
                  <div className={`mr-4 h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                    request.status !== "pending" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <span>2</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">
                      {request.status === "rejected" || request.status === "cancelled"
                        ? "Request Cancelled"
                        : "Request Accepted"}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {request.status === "pending"
                        ? "Waiting for response"
                        : "In progress"}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start">
                  <div className={`mr-4 h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                    request.paymentStatus === "paid" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <span>3</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Payment</h4>
                    <p className="text-xs text-muted-foreground">
                      {request.paymentStatus === "paid" ? "Paid" : "Pending payment"}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start">
                  <div className={`mr-4 h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                    request.status === "delivered" || request.status === "completed" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <span>4</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Delivery</h4>
                    <p className="text-xs text-muted-foreground">
                      {request.status === "delivered" || request.status === "completed" ? "Delivered" : "Pending delivery"}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start">
                  <div className={`mr-4 h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                    request.status === "completed" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <span>5</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Completed</h4>
                    <p className="text-xs text-muted-foreground">
                      {request.status === "completed" ? "Completed" : "Not completed yet"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Forms */}
      {showReviewForm && (
        <ReviewForm
          request={request}
          onClose={() => setShowReviewForm(false)}
          onSuccess={() => {
            setRequest({
              ...request,
              reviewId: "pending", // Temporary value until page refresh
            })
          }}
        />
      )}

      {showPaymentForm && (
        <PaymentForm
          request={request}
          onClose={() => setShowPaymentForm(false)}
          onSuccess={() => {
            setRequest({
              ...request,
              paymentStatus: "paid",
              status: "in_progress",
            })
          }}
        />
      )}

      {showDeliveryForm && (
        <DeliveryForm
          request={request}
          onClose={() => setShowDeliveryForm(false)}
          onSuccess={() => {
            setRequest({
              ...request,
              status: "delivered",
            })
          }}
        />
      )}
    </div>
  )
}