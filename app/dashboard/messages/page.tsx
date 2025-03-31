"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import type { ServiceRequest } from "@/types/service"
import type { UserData } from "@/lib/auth/auth-provider"
import { Loader2, Send } from "lucide-react"

interface Message {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: any
  requestId: string
}

export default function MessagesPage() {
  const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null)
  const [otherParty, setOtherParty] = useState<UserData | null>(null)
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user, userData } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestId = searchParams.get("requestId")
  const { toast } = useToast()

  // Fetch all requests the user is involved in
  useEffect(() => {
    if (!user) return

    async function fetchRequests() {
      try {
        // Determine which field to query based on user role
        const fieldToQuery = userData?.role === "client" ? "clientId" : "serviceOwnerId"

        const requestsQuery = query(
          collection(db, "requests"),
          where(fieldToQuery, "==", user.uid),
          orderBy("updatedAt", "desc"),
        )

        const querySnapshot = await getDocs(requestsQuery)

        const requestsData: ServiceRequest[] = []
        querySnapshot.forEach((doc) => {
          requestsData.push({ id: doc.id, ...doc.data() } as ServiceRequest)
        })

        setRequests(requestsData)

        // If requestId is provided in URL, set it as active
        if (requestId && requestsData.length > 0) {
          const selectedRequest = requestsData.find((req) => req.id === requestId)
          if (selectedRequest) {
            setActiveRequest(selectedRequest)
            fetchOtherParty(selectedRequest)
          }
        } else if (requestsData.length > 0) {
          // Otherwise set the first request as active
          setActiveRequest(requestsData[0])
          fetchOtherParty(requestsData[0])
        }
      } catch (error) {
        console.error("Error fetching requests:", error)
        toast({
          title: "Error",
          description: "Failed to load your conversations",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequests()
  }, [user, userData, requestId, toast])

  // Fetch the other party's details
  const fetchOtherParty = async (request: ServiceRequest) => {
    try {
      const otherPartyId = userData?.role === "client" ? request.serviceOwnerId : request.clientId
      const otherPartyDoc = await getDoc(doc(db, "users", otherPartyId))

      if (otherPartyDoc.exists()) {
        setOtherParty(otherPartyDoc.data() as UserData)
      }
    } catch (error) {
      console.error("Error fetching other party details:", error)
    }
  }

  // Subscribe to messages for the active request
  useEffect(() => {
    if (!activeRequest) return

    const messagesQuery = query(
      collection(db, "messages"),
      where("requestId", "==", activeRequest.id),
      orderBy("timestamp", "asc"),
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData: Message[] = []
      snapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() } as Message)
      })
      setMessages(messagesData)
      scrollToBottom()
    })

    return () => unsubscribe()
  }, [activeRequest])

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Handle selecting a request
  const handleSelectRequest = async (request: ServiceRequest) => {
    setActiveRequest(request)
    await fetchOtherParty(request)
  }

  // Send a new message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !activeRequest || !user || !userData) return

    setIsSending(true)
    try {
      await addDoc(collection(db, "messages"), {
        requestId: activeRequest.id,
        senderId: user.uid,
        senderName: userData.displayName,
        senderAvatar: userData.photoURL,
        content: newMessage,
        timestamp: serverTimestamp(),
      })

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ""

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading messages...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>

      {requests.length === 0 ? (
        <Card className="text-center p-8">
          <CardContent>
            <h2 className="text-xl font-semibold mb-2">No Conversations Yet</h2>
            <p className="text-muted-foreground mb-4">
              You don't have any active conversations. Start by browsing services or checking your requests.
            </p>
            <Button onClick={() => router.push(userData?.role === "client" ? "/services" : "/dashboard/requests")}>
              {userData?.role === "client" ? "Browse Services" : "View Requests"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 h-[70vh]">
          {/* Conversations List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="p-3 bg-muted font-medium">Conversations</div>
            <div className="overflow-y-auto h-[calc(70vh-40px)]">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`p-4 border-b cursor-pointer hover:bg-accent transition-colors ${
                    activeRequest?.id === request.id ? "bg-accent" : ""
                  }`}
                  onClick={() => handleSelectRequest(request)}
                >
                  <div className="font-medium line-clamp-1">{request.serviceName}</div>
                  <div className="text-sm text-muted-foreground">
                    {userData?.role === "client" ? `To: ${request.serviceOwnerId}` : `From: ${request.clientName}`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{formatDate(request.updatedAt)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="border rounded-lg overflow-hidden flex flex-col">
            {activeRequest ? (
              <>
                {/* Header */}
                <div className="p-4 border-b bg-muted">
                  <div className="font-medium">{activeRequest.serviceName}</div>
                  <div className="text-sm text-muted-foreground">
                    {otherParty ? `Chatting with ${otherParty.displayName}` : "Loading..."}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderId === user?.uid ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] ${
                            message.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-muted"
                          } rounded-lg p-3`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={message.senderAvatar || ""} alt={message.senderName} />
                              <AvatarFallback>
                                {message.senderName ? message.senderName.charAt(0).toUpperCase() : "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">{message.senderName}</span>
                          </div>
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          <div className="text-xs opacity-70 text-right mt-1">{formatDate(message.timestamp)}</div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t">
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={isSending}
                    />
                    <Button type="submit" disabled={isSending || !newMessage.trim()}>
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

