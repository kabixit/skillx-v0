"use client"

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  collection, query, where, getDocs, orderBy, 
  doc, getDoc, addDoc, serverTimestamp, onSnapshot 
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth/auth-provider";
import { db } from "@/lib/firebase/config";
import type { ServiceRequest } from "@/types/service";
import type { UserData } from "@/lib/auth/auth-provider";
import { Loader2, Send, Paperclip, Smile, X, Image, File } from "lucide-react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import dynamic from "next/dynamic";

// Dynamically import EmojiPicker to avoid SSR issues
const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => <div className="w-[300px] h-[350px] bg-gray-100 rounded-lg" />
  }
);

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: any;
  requestId: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

interface FilePreview {
  file: File;
  previewUrl: string;
}

interface EmojiClickData {
  emoji: string;
  activeSkinTone: string;
  unified: string;
}

export default function MessagesPage() {
  const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);
  const [otherParty, setOtherParty] = useState<UserData | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  const { user, userData } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");
  const { toast } = useToast();
  const storage = getStorage();

  // Fetch all requests the user is involved in
  useEffect(() => {
    if (!user) return;

    async function fetchRequests() {
      try {
        const fieldToQuery = userData?.role === "client" ? "clientId" : "serviceOwnerId";

        const requestsQuery = query(
          collection(db, "requests"),
          where(fieldToQuery, "==", user.uid),
          orderBy("updatedAt", "desc"),
        );

        const querySnapshot = await getDocs(requestsQuery);

        const requestsData: ServiceRequest[] = [];
        querySnapshot.forEach((doc) => {
          requestsData.push({ id: doc.id, ...doc.data() } as ServiceRequest);
        });

        setRequests(requestsData);

        if (requestId && requestsData.length > 0) {
          const selectedRequest = requestsData.find((req) => req.id === requestId);
          if (selectedRequest) {
            setActiveRequest(selectedRequest);
            fetchOtherParty(selectedRequest);
          }
        } else if (requestsData.length > 0) {
          setActiveRequest(requestsData[0]);
          fetchOtherParty(requestsData[0]);
        }
      } catch (error) {
        console.error("Error fetching requests:", error);
        toast({
          title: "Error",
          description: "Failed to load your conversations",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchRequests();
  }, [user, userData, requestId, toast]);

  // Fetch the other party's details
  const fetchOtherParty = async (request: ServiceRequest) => {
    try {
      const otherPartyId = userData?.role === "client" ? request.serviceOwnerId : request.clientId;
      const otherPartyDoc = await getDoc(doc(db, "users", otherPartyId));

      if (otherPartyDoc.exists()) {
        setOtherParty(otherPartyDoc.data() as UserData);
      }
    } catch (error) {
      console.error("Error fetching other party details:", error);
    }
  };

  // Subscribe to messages for the active request
  useEffect(() => {
    if (!activeRequest) return;

    const messagesQuery = query(
      collection(db, "messages"),
      where("requestId", "==", activeRequest.id),
      orderBy("timestamp", "asc"),
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData: Message[] = [];
      snapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(messagesData);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [activeRequest]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSelectRequest = async (request: ServiceRequest) => {
    setActiveRequest(request);
    await fetchOtherParty(request);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFilePreviews: FilePreview[] = [];
    
    Array.from(files).forEach(file => {
      const previewUrl = file.type.startsWith('image/') 
        ? URL.createObjectURL(file) 
        : null;
      newFilePreviews.push({ file, previewUrl });
    });

    setFilePreviews(prev => [...prev, ...newFilePreviews]);
  };

  const removeFilePreview = (index: number) => {
    setFilePreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index].previewUrl || '');
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  const uploadFiles = async () => {
    if (!activeRequest || !user || !userData || filePreviews.length === 0) return;

    setIsUploading(true);
    try {
      for (const preview of filePreviews) {
        const fileRef = ref(storage, `messages/${activeRequest.id}/${preview.file.name}-${Date.now()}`);
        
        const metadata = {
          contentType: preview.file.type,
          customMetadata: {
            uploadedBy: user.uid,
            requestId: activeRequest.id
          }
        };

        const snapshot = await uploadBytes(fileRef, preview.file, metadata);
        const downloadURL = await getDownloadURL(snapshot.ref);

        await addDoc(collection(db, "messages"), {
          requestId: activeRequest.id,
          senderId: user.uid,
          senderName: userData.displayName,
          senderAvatar: userData.photoURL,
          content: "",
          fileUrl: downloadURL,
          fileName: preview.file.name,
          fileType: preview.file.type,
          timestamp: serverTimestamp(),
        });
      }

      setFilePreviews([]);
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() && filePreviews.length === 0) return;
    if (!activeRequest || !user || !userData) return;

    setIsSending(true);

    try {
      // Send text message if there's content
      if (newMessage.trim()) {
        await addDoc(collection(db, "messages"), {
          requestId: activeRequest.id,
          senderId: user.uid,
          senderName: userData.displayName,
          senderAvatar: userData.photoURL,
          content: newMessage,
          timestamp: serverTimestamp(),
        });
      }

      // Upload files if there are any
      if (filePreviews.length > 0) {
        await uploadFiles();
      }

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const renderFileMessage = (message: Message) => {
    if (!message.fileUrl) return null;

    if (message.fileType?.startsWith("image/")) {
      return (
        <div className="mt-2">
          <img 
            src={message.fileUrl} 
            alt={message.fileName || "Uploaded image"} 
            className="max-w-full max-h-64 rounded-md"
          />
        </div>
      );
    }

    return (
      <div className="mt-2">
        <a 
          href={message.fileUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline flex items-center gap-2"
        >
          <File className="h-4 w-4" />
          {message.fileName || "Download file"}
        </a>
      </div>
    );
  };

  const renderFilePreview = (preview: FilePreview, index: number) => {
    return (
      <div key={index} className="relative border rounded-md p-2 mb-2 max-w-xs">
        <button
          type="button"
          onClick={() => removeFilePreview(index)}
          className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
        >
          <X className="h-3 w-3 text-white" />
        </button>
        
        {preview.previewUrl ? (
          <div className="flex flex-col items-center">
            <Image className="h-8 w-8 mb-1" />
            <img 
              src={preview.previewUrl} 
              alt="Preview" 
              className="max-h-32 object-contain"
            />
            <p className="text-xs truncate w-full text-center mt-1">{preview.file.name}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <File className="h-8 w-8" />
            <div>
              <p className="text-sm font-medium truncate max-w-[200px]">{preview.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(preview.file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading messages...</span>
        </div>
      </div>
    );
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
                          {message.content && <div className="whitespace-pre-wrap">{message.content}</div>}
                          {renderFileMessage(message)}
                          <div className="text-xs opacity-70 text-right mt-1">{formatDate(message.timestamp)}</div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t relative">
                  {filePreviews.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {filePreviews.map((preview, index) => renderFilePreview(preview, index))}
                    </div>
                  )}
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <div className="relative flex-1 flex items-center">
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={isSending || isUploading}
                        className="pr-20"
                      />
                      <div className="absolute right-2 flex space-x-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        >
                          <Smile className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                          onClick={handleUploadClick}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                          accept="image/*, .pdf, .doc, .docx, .txt"
                          multiple
                        />
                      </div>
                      {showEmojiPicker && (
                        <div ref={emojiPickerRef} className="absolute bottom-12 right-0 z-10 shadow-lg">
                          <EmojiPicker 
                            onEmojiClick={onEmojiClick} 
                            width={300}
                            height={350}
                            previewConfig={{
                              showPreview: false
                            }}
                            skinTonesDisabled
                            searchDisabled={false}
                          />
                        </div>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isSending || isUploading || (!newMessage.trim() && filePreviews.length === 0)}
                    >
                      {isSending || isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
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
  );
}