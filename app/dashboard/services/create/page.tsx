"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { getDownloadURL, ref, uploadBytes } from "firebase/storage"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-provider"
import { db, storage } from "@/lib/firebase/config"
import { SERVICE_CATEGORIES } from "@/types/service"
import { Loader2, Plus, X } from "lucide-react"

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000, "Description is too long"),
  category: z.string().min(1, "Please select a category"),
  subcategory: z.string().min(1, "Please select a subcategory"),
  price: z.object({
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Please enter a valid price"),
    unit: z.enum(["hour", "project", "day"], {
      required_error: "Please select a pricing unit",
    }),
  }),
  deliveryTime: z.string().regex(/^\d+$/, "Please enter a valid number of days"),
  revisions: z.string().regex(/^\d+$/, "Please enter a valid number of revisions"),
  skills: z.string().min(2, "Please enter at least one skill"),
})

export default function CreateServicePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [requirements, setRequirements] = useState<string[]>([])
  const [newRequirement, setNewRequirement] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const { user, userData } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      subcategory: "",
      price: {
        amount: "",
        unit: "hour",
      },
      deliveryTime: "",
      revisions: "",
      skills: "",
    },
  })

  const watchCategory = form.watch("category")
  if (watchCategory !== selectedCategory) {
    setSelectedCategory(watchCategory)
    form.setValue("subcategory", "")
  }

  const selectedCategoryData = SERVICE_CATEGORIES.find((cat) => cat.name === selectedCategory)

  const addRequirement = () => {
    if (newRequirement.trim() && requirements.length < 10) {
      setRequirements([...requirements, newRequirement.trim()])
      setNewRequirement("")
    }
  }

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      if (images.length + newFiles.length <= 5) {
        setImages([...images, ...newFiles])
      } else {
        toast({
          title: "Too many images",
          description: "You can upload a maximum of 5 images",
          variant: "destructive",
        })
      }
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  async function uploadImages() {
    if (images.length === 0) return []
    
    const imageUrls: string[] = []
    
    try {
      for (const image of images) {
        // Create a unique filename with timestamp and random string
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 8)
        const filename = `${timestamp}_${randomString}_${image.name.replace(/\s+/g, '_')}`
        
        const storageRef = ref(storage, `services/${user?.uid}/${filename}`)
        
        // Upload the file
        const snapshot = await uploadBytes(storageRef, image)
        
        // Get the download URL
        const url = await getDownloadURL(snapshot.ref)
        imageUrls.push(url)
        
        // Update progress
        setUploadProgress(Math.round((imageUrls.length / images.length) * 100))
      }
      
      return imageUrls
    } catch (error) {
      console.error("Error uploading images:", error)
      toast({
        title: "Image upload failed",
        description: "There was an error uploading your images. Please try again.",
        variant: "destructive",
      })
      throw error
    } finally {
      setUploadProgress(0)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a service",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    
    try {
      // Upload images first
      const imageUrls = await uploadImages()

      // Convert skills string to array
      const skillsArray = values.skills.split(",").map((skill) => skill.trim())

      // Create the service document
      const serviceData = {
        userId: user.uid,
        title: values.title,
        description: values.description,
        category: values.category,
        subcategory: values.subcategory,
        price: {
          amount: Number.parseFloat(values.price.amount),
          currency: "USD",
          unit: values.price.unit,
        },
        skills: skillsArray,
        deliveryTime: Number.parseInt(values.deliveryTime),
        revisions: Number.parseInt(values.revisions),
        requirements: requirements,
        images: imageUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "active",
        featured: false,
        tags: [...skillsArray, values.category, values.subcategory],
        createdBy: {
          uid: user.uid,
          displayName: userData?.displayName || "",
          photoURL: userData?.photoURL || "",
        }
      }

      await addDoc(collection(db, "services"), serviceData)

      toast({
        title: "Service created!",
        description: "Your service has been published successfully",
      })

      // Navigate to service management
      router.push("/dashboard/services")
    } catch (error: any) {
      console.error("Service creation error:", error)
      toast({
        title: "Failed to create service",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create a New Service</h1>
        <p className="text-muted-foreground">Describe the service you want to offer to potential clients</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
          <CardDescription>Provide detailed information about your service</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* ... (keep all your existing form fields exactly as they were) ... */}

              <div>
                <FormLabel>Service Images</FormLabel>
                <div className="mt-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    multiple
                    disabled={images.length >= 5}
                  />
                  <FormDescription>
                    Upload up to 5 images showcasing your service (max 5MB each)
                  </FormDescription>
                </div>
                {images.length > 0 && (
                  <div className="mt-4">
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-muted-foreground mb-1">
                          <span>Uploading images...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {images.map((image, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-md overflow-hidden bg-muted">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`Preview ${index}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || uploadProgress > 0}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Service...
                  </>
                ) : uploadProgress > 0 ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading Images ({uploadProgress}%)
                  </>
                ) : (
                  "Create Service"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}