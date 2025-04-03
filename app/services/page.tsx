"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
} from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { db } from "@/lib/firebase/config"
import { type Service, SERVICE_CATEGORIES } from "@/types/service"
import { Search, Filter, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("")
  const [sortBy, setSortBy] = useState<string>("newest")
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const selectedCategoryData = SERVICE_CATEGORIES.find((cat) => cat.name === selectedCategory)

  useEffect(() => {
    fetchServices()
  }, [selectedCategory, selectedSubcategory, sortBy])

  async function fetchServices(isLoadMore = false) {
    if (isLoadMore) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
      setLastVisible(null)
    }

    try {
      let servicesQuery = query(collection(db, "services"), where("status", "==", "active"), limit(12))

      // Apply category filter
      if (selectedCategory) {
        servicesQuery = query(servicesQuery, where("category", "==", selectedCategory))
      }

      // Apply subcategory filter
      if (selectedSubcategory) {
        servicesQuery = query(servicesQuery, where("subcategory", "==", selectedSubcategory))
      }

      // Apply sorting
      switch (sortBy) {
        case "newest":
          servicesQuery = query(servicesQuery, orderBy("createdAt", "desc"))
          break
        case "oldest":
          servicesQuery = query(servicesQuery, orderBy("createdAt", "asc"))
          break
        case "price_low":
          servicesQuery = query(servicesQuery, orderBy("price.amount", "asc"))
          break
        case "price_high":
          servicesQuery = query(servicesQuery, orderBy("price.amount", "desc"))
          break
        default:
          servicesQuery = query(servicesQuery, orderBy("createdAt", "desc"))
      }

      // If loading more, start after the last visible document
      if (isLoadMore && lastVisible) {
        servicesQuery = query(servicesQuery, startAfter(lastVisible))
      }

      const querySnapshot = await getDocs(servicesQuery)

      // Set the last visible document for pagination
      const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1]
      setLastVisible(lastVisibleDoc || null)

      // Check if there are more results
      setHasMore(querySnapshot.docs.length === 12)

      const servicesData: Service[] = []
      querySnapshot.forEach((doc) => {
        servicesData.push({ id: doc.id, ...doc.data() } as Service)
      })

      if (isLoadMore) {
        setServices((prev) => [...prev, ...servicesData])
      } else {
        setServices(servicesData)
      }
    } catch (error) {
      console.error("Error fetching services:", error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Reset filters when searching
    setSelectedCategory("")
    setSelectedSubcategory("")
    fetchServices()
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    setSelectedSubcategory("")
  }

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore) {
      fetchServices(true)
    }
  }

  const filteredServices = services.filter((service) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      service.title.toLowerCase().includes(searchLower) ||
      service.description.toLowerCase().includes(searchLower) ||
      service.skills.some((skill) => skill.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div className="container py-8 pl-8 pr-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Browse Services</h1>
        <p className="text-muted-foreground">Find the perfect service for your needs</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[250px_1fr]">
        {/* Filters Sidebar */}
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">Search</h3>
            <form onSubmit={handleSearch} className="flex space-x-2">
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button type="submit" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <div>
            <h3 className="font-medium mb-3">Category</h3>
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {SERVICE_CATEGORIES.map((category) => (
                  <SelectItem key={category.name} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategory && (
            <div>
              <h3 className="font-medium mb-3">Subcategory</h3>
              <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {selectedCategoryData?.subcategories.map((subcategory) => (
                    <SelectItem key={subcategory} value={subcategory}>
                      {subcategory}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <h3 className="font-medium mb-3">Sort By</h3>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSearchTerm("")
              setSelectedCategory("")
              setSelectedSubcategory("")
              setSortBy("newest")
              fetchServices()
            }}
          >
            <Filter className="h-4 w-4 mr-2" /> Reset Filters
          </Button>
        </div>

        {/* Services Grid */}
        <div>
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-[200px] w-full" />
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-4" />
                      <Skeleton className="h-4 w-1/4" />
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">No services found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search or filters</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedCategory("")
                  setSelectedSubcategory("")
                  setSortBy("newest")
                  fetchServices()
                }}
              >
                Reset All Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredServices.map((service) => (
                  <Link href={`/services/${service.id}`} key={service.id}>
                    <Card className="overflow-hidden h-full hover:shadow-md transition-shadow cursor-pointer">
                      <div className="aspect-video relative bg-muted">
                        {service.images && service.images.length > 0 ? (
                          <img
                            src={service.images[0] || "/placeholder.svg"}
                            alt={service.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="secondary">{service.category}</Badge>
                          <Badge variant="outline">{service.subcategory}</Badge>
                        </div>
                        <h3 className="font-semibold line-clamp-1 mb-1">{service.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{service.description}</p>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold">${service.price.amount}</span>
                            <span className="text-muted-foreground text-sm"> / {service.price.unit}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {service.deliveryTime} day{service.deliveryTime !== 1 && "s"}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 text-center">
                  <Button onClick={handleLoadMore} disabled={isLoadingMore}>
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

