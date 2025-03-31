"use client"

import type React from "react"

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
  const [uploadingImages, setUploadingImages] = useState(false)
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

    setUploadingImages(true)
    const imageUrls: string[] = []

    try {
      for (const image of images) {
        const storageRef = ref(storage, `services/${user?.uid}/${Date.now()}_${image.name}`)
        const snapshot = await uploadBytes(storageRef, image)
        const url = await getDownloadURL(snapshot.ref)
        imageUrls.push(url)
      }
      return imageUrls
    } catch (error) {
      console.error("Error uploading images:", error)
      throw error
    } finally {
      setUploadingImages(false)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return

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
      }

      const serviceRef = await addDoc(collection(db, "services"), serviceData)

      toast({
        title: "Service created!",
        description: "Your service has been published successfully",
      })

      // Navigate to service management
      router.push("/dashboard/services")
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Failed to create service",
        description: error.message,
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
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Professional Logo Design" {...field} />
                    </FormControl>
                    <FormDescription>A clear, concise title that describes your service</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe your service in detail..." className="min-h-[150px]" {...field} />
                    </FormControl>
                    <FormDescription>
                      Provide a detailed description of what you offer, your process, and what clients can expect
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SERVICE_CATEGORIES.map((category) => (
                            <SelectItem key={category.name} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Choose the category that best fits your service</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcategory</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedCategory}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a subcategory" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedCategoryData?.subcategories.map((subcategory) => (
                            <SelectItem key={subcategory} value={subcategory}>
                              {subcategory}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Choose a more specific subcategory</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="price.amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 border border-r-0 border-input rounded-l-md bg-muted text-muted-foreground">
                            $
                          </span>
                          <Input className="rounded-l-none" placeholder="99.99" {...field} />
                        </div>
                      </FormControl>
                      <FormDescription>Set your price in USD</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price.unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pricing Unit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pricing unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hour">Per Hour</SelectItem>
                          <SelectItem value="project">Per Project</SelectItem>
                          <SelectItem value="day">Per Day</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>How you want to charge for this service</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deliveryTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Time (days)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" placeholder="7" {...field} />
                      </FormControl>
                      <FormDescription>How many days to complete the service</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="revisions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Revisions</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="3" {...field} />
                      </FormControl>
                      <FormDescription>How many revisions you offer</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skills</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. JavaScript, React, UI/UX Design" {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated list of relevant skills</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormLabel>Requirements from Clients</FormLabel>
                <div className="flex mt-2 mb-4">
                  <Input
                    placeholder="What do you need from clients to get started?"
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    className="mr-2"
                  />
                  <Button type="button" onClick={addRequirement} size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                {requirements.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {requirements.map((req, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm">{req}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRequirement(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <FormDescription>
                  List what you need from clients to deliver your service (max 10 items)
                </FormDescription>
              </div>

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
                  <FormDescription>Upload up to 5 images showcasing your service (max 5MB each)</FormDescription>
                </div>
                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-md overflow-hidden bg-muted">
                          <img
                            src={URL.createObjectURL(image) || "/placeholder.svg"}
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
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || uploadingImages}>
                {isLoading || uploadingImages ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadingImages ? "Uploading Images..." : "Creating Service..."}
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

