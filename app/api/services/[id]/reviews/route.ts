import { NextResponse } from "next/server"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const serviceId = params.id

    if (!serviceId) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 })
    }

    const reviewsQuery = query(collection(db, "reviews"), where("serviceId", "==", serviceId))

    const querySnapshot = await getDocs(reviewsQuery)

    const reviews: any[] = []
    querySnapshot.forEach((doc) => {
      reviews.push({ id: doc.id, ...doc.data() })
    })

    return NextResponse.json(reviews)
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}

