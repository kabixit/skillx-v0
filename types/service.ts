export interface Service {
  id: string
  userId: string
  title: string
  description: string
  category: string
  subcategory?: string
  price: {
    amount: number
    currency: string
    unit: "hour" | "project" | "day"
  }
  skills: string[]
  deliveryTime: number // in days
  revisions: number
  images: string[]
  requirements: string[]
  createdAt: any // Firestore Timestamp
  updatedAt: any // Firestore Timestamp
  status: "active" | "paused" | "draft"
  featured: boolean
  tags: string[]
  averageRating?: number
  totalReviews?: number
  completedOrders?: number
}

export interface ServiceRequest {
  id: string
  serviceId: string
  serviceName: string
  serviceOwnerId: string
  clientId: string
  clientName: string
  requirements: string
  timeline: number // in days
  budget: number
  attachments?: string[]
  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "completed"
    | "cancelled"
    | "in_progress"
    | "delivered"
    | "revision_requested"
  createdAt: any // Firestore Timestamp
  updatedAt: any // Firestore Timestamp
  messages?: {
    id: string
    senderId: string
    message: string
    timestamp: any
  }[]
  deliveryFiles?: string[]
  paymentStatus?: "pending" | "paid" | "refunded"
  paymentId?: string
  reviewId?: string
}

export interface Review {
  id: string
  serviceId: string
  requestId: string
  reviewerId: string
  reviewerName: string
  reviewerAvatar?: string
  freelancerId: string
  rating: number
  comment: string
  createdAt: any
  response?: {
    comment: string
    createdAt: any
  }
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: "request" | "message" | "payment" | "review" | "system"
  read: boolean
  createdAt: any
  linkTo?: string
  relatedId?: string
}

export interface Transaction {
  id: string
  userId: string
  requestId: string
  serviceId: string
  amount: number
  currency: string
  status: "pending" | "completed" | "refunded" | "failed"
  type: "payment" | "payout" | "refund"
  createdAt: any
  paymentMethod?: string
  description: string
}

export interface Portfolio {
  id: string
  userId: string
  title: string
  description: string
  category: string
  images: string[]
  link?: string
  createdAt: any
}

export const SERVICE_CATEGORIES = [
  {
    name: "Design & Creative",
    subcategories: [
      "Logo Design",
      "Web Design",
      "Graphic Design",
      "UI/UX Design",
      "Illustration",
      "Animation",
      "Brand Identity",
    ],
  },
  {
    name: "Development & IT",
    subcategories: [
      "Web Development",
      "Mobile Development",
      "Desktop Applications",
      "Game Development",
      "DevOps",
      "Database Design",
      "QA & Testing",
    ],
  },
  {
    name: "Writing & Translation",
    subcategories: [
      "Content Writing",
      "Copywriting",
      "Technical Writing",
      "Translation",
      "Proofreading",
      "Editing",
      "Transcription",
    ],
  },
  {
    name: "Marketing & Business",
    subcategories: [
      "Social Media Marketing",
      "SEO",
      "Email Marketing",
      "Market Research",
      "Business Planning",
      "Financial Consulting",
      "Legal Consulting",
    ],
  },
  {
    name: "Audio & Video",
    subcategories: [
      "Video Editing",
      "Voice Over",
      "Audio Editing",
      "Music Production",
      "Podcast Production",
      "Animation",
      "Visual Effects",
    ],
  },
]

