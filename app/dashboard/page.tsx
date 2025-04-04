"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-provider"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { ethers } from "ethers"

type Service = {
  id: string
  title: string
  description: string
  price: {
    amount: number
    currency: string
    unit: string
  }
  status: 'active' | 'inactive'
  createdAt: Date
  deliveryTime: number
  category: string
  subcategory: string
  images: string[]
  userId: string
}

type Request = {
  id: string
  serviceId: string
  serviceName: string
  clientId: string
  clientName: string
  serviceOwnerId: string
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'in_escrow'
  createdAt: Date
  updatedAt: Date
  budget: number
  requirements: string
  timeline: number
  paymentStatus: string
  attachments?: string[]
}

type Transaction = {
  id: string
  amount: number
  type: 'payment' | 'payout' | 'refund' | 'credit_purchase'
  description: string
  createdAt: Date
  currency: string
  paymentMethod: string
  status: string
  requestId?: string
  serviceId?: string
  transactionHash?: string
}

export default function Dashboard() {
  const router = useRouter()
  const { user, userData, isLoading } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [isMetaMaskDialogOpen, setIsMetaMaskDialogOpen] = useState(false)
  const [creditAmount, setCreditAmount] = useState(10)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [hasMetaMask, setHasMetaMask] = useState(false)

  useEffect(() => {
    // Check if MetaMask is installed
    setHasMetaMask(typeof window !== 'undefined' && !!window.ethereum?.isMetaMask)
  }, [])

  useEffect(() => {
    if (!isLoading && (!user || !userData)) {
      router.push("/sign-in")
    }
  }, [user, userData, isLoading, router])

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user || !userData) return

      try {
        setLoadingData(true)
        
        const transactionsQuery = query(
          collection(db, "transactions"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(5)
        )
        const transactionsSnapshot = await getDocs(transactionsQuery)
        const transactionsData = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate()
        })) as Transaction[]
        setTransactions(transactionsData)

        if (userData.role === 'freelancer') {
          const servicesQuery = query(
            collection(db, "services"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(3)
          )
          const servicesSnapshot = await getDocs(servicesQuery)
          const servicesData = servicesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate()
          })) as Service[]
          setServices(servicesData)

          const requestsQuery = query(
            collection(db, "requests"),
            where("serviceOwnerId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(5)
          )
          const requestsSnapshot = await getDocs(requestsQuery)
          const requestsData = requestsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate(),
            updatedAt: doc.data().updatedAt.toDate()
          })) as Request[]
          setRequests(requestsData)
        } else {
          const requestsQuery = query(
            collection(db, "requests"),
            where("clientId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(5)
          )
          const requestsSnapshot = await getDocs(requestsQuery)
          const requestsData = requestsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate(),
            updatedAt: doc.data().updatedAt.toDate()
          })) as Request[]
          setRequests(requestsData)
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoadingData(false)
      }
    }

    fetchDashboardData()
  }, [user, userData])

  const handleAddCredits = () => {
    if (!hasMetaMask) {
      toast({
        title: "MetaMask not found",
        description: "Please install MetaMask to add credits",
        variant: "destructive",
      })
      return
    }
    setIsMetaMaskDialogOpen(true)
  }

  const processMetaMaskPayment = async () => {
    setIsProcessingPayment(true)
    
    try {
      // This will open MetaMask by requesting accounts
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      
      toast({
        title: "MetaMask opened",
        description: "You can now proceed with payment",
      })
    } catch (error) {
      console.error("Error opening MetaMask:", error)
      toast({
        title: "Error",
        description: "Failed to open MetaMask. Please ensure it's installed and try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessingPayment(false)
      setIsMetaMaskDialogOpen(false)
    }
  }

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'accepted':
        return <Badge className="bg-green-500">Accepted</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'completed':
        return <Badge className="bg-purple-500">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  if (isLoading || loadingData) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mt-2" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!user || !userData) return null

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome back, {userData.displayName}</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Credits:</span>
            <span className="text-lg font-bold">{userData.credits || 0}</span>
          </div>
          <Button 
            size="sm" 
            onClick={handleAddCredits}
            disabled={!hasMetaMask}
          >
            Add Credits
          </Button>
        </div>
      </div>

      <Dialog open={isMetaMaskDialogOpen} onOpenChange={setIsMetaMaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credits</DialogTitle>
            <DialogDescription>
              Add credits to your account using MetaMask
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(Number(e.target.value))}
                />
                <span>credits</span>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Image
                  src="/metamask-icon.png"
                  alt="MetaMask"
                  width={24}
                  height={24}
                />
                <span>MetaMask</span>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={processMetaMaskPayment}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? "Opening..." : "Pay with MetaMask"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active {userData.role === 'freelancer' ? 'Services' : 'Requests'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userData.role === 'freelancer' 
                ? services.filter(s => s.status === 'active').length
                : requests.filter(r => ['pending', 'accepted'].includes(r.status)).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter(r => r.status === 'pending' && 
                (userData.role === 'freelancer' || r.clientId === user.uid)).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Earnings/Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                transactions.reduce((sum, t) => {
                  if (userData.role === 'freelancer' && t.type === 'payment') {
                    return sum + t.amount
                  } else if (userData.role === 'client' && t.type === 'payment') {
                    return sum - t.amount
                  }
                  return sum
                }, 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent {userData.role === 'freelancer' ? 'Service Requests' : 'Your Requests'}</span>
            <Button 
              size="sm" 
              onClick={() => router.push(userData.role === 'freelancer' ? '/dashboard/requests' : '/dashboard/requests')}
            >
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                {userData.role === 'freelancer' && <TableHead>Client</TableHead>}
                <TableHead>Budget</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length > 0 ? (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.serviceName}</TableCell>
                    {userData.role === 'freelancer' && (
                      <TableCell>{request.clientName}</TableCell>
                    )}
                    <TableCell>{formatCurrency(request.budget)}</TableCell>
                    <TableCell>{request.timeline} days</TableCell>
                    <TableCell>{getRequestStatusBadge(request.status)}</TableCell>
                    <TableCell>{getPaymentStatusBadge(request.paymentStatus)}</TableCell>
                    <TableCell>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/dashboard/requests/${request.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={userData.role === 'freelancer' ? 8 : 7} className="text-center">
                    No requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Freelancer-specific content */}
      {userData.role === 'freelancer' && services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Your Services</span>
              <Button size="sm" onClick={() => router.push('/dashboard/services')}>
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Card key={service.id}>
                  <CardHeader>
                    {service.images?.length > 0 && (
                      <div className="relative h-40 w-full rounded-md overflow-hidden mb-4">
                        <Image
                          src={service.images[0]}
                          alt={service.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <CardTitle className="text-lg">{service.title}</CardTitle>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-muted-foreground">
                        {service.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                      <span className="font-bold">
                        {formatCurrency(service.price.amount, service.price.currency)}/{service.price.unit}
                      </span>
                    </div>
                    <CardDescription className="mt-1">
                      {service.category} • {service.subcategory}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm line-clamp-2">{service.description}</p>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm">
                        Delivery in {service.deliveryTime} days
                      </span>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0"
                        onClick={() => router.push(`/dashboard/services/${service.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Transactions</span>
            <Button size="sm" onClick={() => router.push('/dashboard/transactions')}>
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      <Badge variant={
                        transaction.type === 'payment' ? 'default' : 
                        transaction.type === 'payout' ? 'secondary' : 'destructive'
                      }>
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </TableCell>
                    <TableCell className="capitalize">{transaction.paymentMethod}</TableCell>
                    <TableCell>
                      <Badge variant={
                        transaction.status === 'completed' ? 'default' : 
                        transaction.status === 'pending' ? 'secondary' : 'destructive'
                      }>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}