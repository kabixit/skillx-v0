"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import type { Portfolio } from "@/types/service"
import { Loader2, Plus, Edit, Trash2, ExternalLink } from "lucide-react"
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

export default function PortfolioPage() {
  const [portfolioItems, setPortfolioItems] = useState<Portfolio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) return

    async function fetchPortfolio() {
      try {
        const portfolioQuery = query(collection(db, "portfolio"), where("userId", "==", user.uid))

        const querySnapshot = await getDocs(portfolioQuery)

        const portfolioData: Portfolio[] = []
        querySnapshot.forEach((doc) => {
          portfolioData.push({ id: doc.id, ...doc.data() } as Portfolio)
        })

        setPortfolioItems(portfolioData)
      } catch (error) {
        console.error("Error fetching portfolio:", error)
        toast({
          title: "Error",
          description: "Failed to load your portfolio",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchPortfolio()
  }, [user, toast])

  const deletePortfolioItem = async () => {
    if (!itemToDelete) return

    try {
      await deleteDoc(doc(db, "portfolio", itemToDelete))

      // Update local state
      setPortfolioItems(portfolioItems.filter((item) => item.id !== itemToDelete))

      toast({
        title: "Portfolio item deleted",
        description: "Your portfolio item has been deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting portfolio item:", error)
      toast({
        title: "Error",
        description: "Failed to delete portfolio item",
        variant: "destructive",
      })
    } finally {
      setItemToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Portfolio</h1>
        </div>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading portfolio...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Portfolio</h1>
        <Button asChild>
          <a href="/dashboard/portfolio/create">
            <Plus className="mr-2 h-4 w-4" /> Add Portfolio Item
          </a>
        </Button>
      </div>

      {portfolioItems.length === 0 ? (
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>No Portfolio Items Yet</CardTitle>
            <CardDescription>Showcase your work by adding portfolio items.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Add your best work to your portfolio to attract more clients.</p>
            <Button asChild>
              <a href="/dashboard/portfolio/create">
                <Plus className="mr-2 h-4 w-4" /> Add Your First Portfolio Item
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {portfolioItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="aspect-video relative bg-muted">
                {item.images && item.images.length > 0 ? (
                  <img
                    src={item.images[0] || "/placeholder.svg"}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
                )}
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.category}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/dashboard/portfolio/edit/${item.id}`}>
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </a>
                  </Button>
                  <AlertDialog open={itemToDelete === item.id} onOpenChange={(open) => !open && setItemToDelete(null)}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setItemToDelete(item.id)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this portfolio item. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={deletePortfolioItem}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                {item.link && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" /> View
                    </a>
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

