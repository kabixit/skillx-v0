"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import type { ServiceRequest } from "@/types/service"
import { Loader2, Clock, DollarSign, ExternalLink, MessageSquare } from "lucide-react"

export default function RequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, userData } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) return

    async function fetchRequests() {
      try {
        // Determine which field to query based on user role
        const fieldToQuery = userData?.role === "client" ? "clientId" : "serviceOwnerId"

        const requestsQuery = query(
          collection(db, "requests"),
          where(fieldToQuery, "==", user.uid),
          orderBy("createdAt", "desc"),
        )

        const querySnapshot = await getDocs(requestsQuery)

        const requestsData: ServiceRequest[] = []
        querySnapshot.forEach((doc) => {
          requestsData.push({ id: doc.id, ...doc.data() } as ServiceRequest)
        })

        setRequests(requestsData)
      } catch (error) {
        console.error("Error fetching requests:", error)
        toast({
          title: "Error",
          description: "Failed to load your requests",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequests()
  }, [user, userData, toast])

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "requests", requestId), {
        status: newStatus,
        updatedAt: new Date(),
      })

      // Update local state
      setRequests(
        requests.map((request) =>
          request.id === requestId
            ? { ...request, status: newStatus as "pending" | "accepted" | "rejected" | "completed" | "cancelled" }
            : request,
        ),
      )

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
        return "default"
      case "completed":
        return "success"
      case "rejected":
      case "cancelled":
        return "destructive"
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
    }).format(date)
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            {userData?.role === "client" ? "My Service Requests" : "Client Requests"}
          </h1>
        </div>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading requests...</span>
        </div>
      </div>
    )
  }

  // Filter requests by status
  const pendingRequests = requests.filter((req) => req.status === "pending")
  const activeRequests = requests.filter((req) => req.status === "accepted")
  const completedRequests = requests.filter((req) => req.status === "completed")
  const cancelledRequests = requests.filter((req) => ["rejected", "cancelled"].includes(req.status))

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          {userData?.role === "client" ? "My Service Requests" : "Client Requests"}
        </h1>
        {userData?.role === "client" && <Button onClick={() => router.push("/services")}>Browse Services</Button>}
      </div>

      <Tabs defaultValue="all" className="mt-6">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeRequests.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedRequests.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelledRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {requests.length === 0 ? (
            <Card className="text-center p-8">
              <CardHeader>
                <CardTitle>No Requests Yet</CardTitle>
                <CardDescription>
                  {userData?.role === "client"
                    ? "You haven't made any service requests yet."
                    : "You haven't received any client requests yet."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  {userData?.role === "client"
                    ? "Browse services and submit a request to get started."
                    : "Create services to start receiving client requests."}
                </p>
                <Button onClick={() => router.push(userData?.role === "client" ? "/services" : "/dashboard/services")}>
                  {userData?.role === "client" ? "Browse Services" : "Manage Services"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  userRole={userData?.role || "client"}
                  onUpdateStatus={updateRequestStatus}
                  formatDate={formatDate}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                  router={router}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No pending requests</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pendingRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  userRole={userData?.role || "client"}
                  onUpdateStatus={updateRequestStatus}
                  formatDate={formatDate}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                  router={router}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active">
          {activeRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No active requests</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  userRole={userData?.role || "client"}
                  onUpdateStatus={updateRequestStatus}
                  formatDate={formatDate}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                  router={router}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No completed requests</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {completedRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  userRole={userData?.role || "client"}
                  onUpdateStatus={updateRequestStatus}
                  formatDate={formatDate}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                  router={router}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled">
          {cancelledRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No cancelled requests</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cancelledRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  userRole={userData?.role || "client"}
                  onUpdateStatus={updateRequestStatus}
                  formatDate={formatDate}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                  router={router}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface RequestCardProps {
  request: ServiceRequest
  userRole: string
  onUpdateStatus: (requestId: string, newStatus: string) => Promise<void>
  formatDate: (timestamp: any) => string
  getStatusBadgeVariant: (status: string) => string
  router: any
}

function RequestCard({
  request,
  userRole,
  onUpdateStatus,
  formatDate,
  getStatusBadgeVariant,
  router,
}: RequestCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <Badge variant={getStatusBadgeVariant(request.status)} className="mb-2">
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Badge>
            <CardTitle className="text-lg line-clamp-1">{request.serviceName}</CardTitle>
          </div>
        </div>
        <CardDescription>
          {userRole === "client"
            ? `Requested on ${formatDate(request.createdAt)}`
            : `From ${request.clientName} on ${formatDate(request.createdAt)}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>
              {request.timeline} day{request.timeline !== 1 && "s"} delivery
            </span>
          </div>
          <div className="flex items-center text-sm">
            <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Budget: ${request.budget}</span>
          </div>
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-1">Requirements:</h4>
            <p className="text-sm text-muted-foreground line-clamp-3">{request.requirements}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="flex space-x-2 w-full">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => router.push(`/dashboard/requests/${request.id}`)}
          >
            <ExternalLink className="h-4 w-4 mr-2" /> View Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => router.push(`/dashboard/messages?requestId=${request.id}`)}
          >
            <MessageSquare className="h-4 w-4 mr-2" /> Messages
          </Button>
        </div>

        {/* Action buttons based on role and status */}
        {userRole === "freelancer" && request.status === "pending" && (
          <div className="flex space-x-2 w-full">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => onUpdateStatus(request.id, "accepted")}
            >
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onUpdateStatus(request.id, "rejected")}
            >
              Decline
            </Button>
          </div>
        )}

        {userRole === "client" && request.status === "pending" && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onUpdateStatus(request.id, "cancelled")}
          >
            Cancel Request
          </Button>
        )}

        {request.status === "accepted" && (
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={() => onUpdateStatus(request.id, "completed")}
          >
            Mark as Completed
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

