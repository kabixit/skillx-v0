export type UserRole = "freelancer" | "client" | "admin"

export interface Profile {
  bio: string
  title: string
  skills: string[]
  location: string
  website?: string
  githubUrl?: string
  linkedinUrl?: string
  availability: "available" | "limited" | "unavailable"
  hourlyRate?: number
  languages: string[]
  education?: Education[]
  certifications?: Certification[]
}

export interface Education {
  degree: string
  institution: string
  startYear: number
  endYear?: number
  current: boolean
  description?: string
}

export interface Certification {
  name: string
  issuer: string
  issueDate: string
  expiryDate?: string
  credentialId?: string
  credentialUrl?: string
}

export interface Skill {
  id: string
  name: string
  category: string
  verified: boolean
  level: "beginner" | "intermediate" | "advanced" | "expert"
  endorsements: number
}

