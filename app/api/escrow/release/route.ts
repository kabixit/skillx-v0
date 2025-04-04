import { NextResponse } from 'next/server'
import { auth } from "@/lib/firebase/config"
import { db } from "@/lib/firebase/config"
import { doc, getDoc, updateDoc, writeBatch, increment, collection } from "firebase/firestore"
import { FirebaseError } from "firebase/app"

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const idToken = authHeader.split('Bearer ')[1]

  try {
    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { requestId, action } = await request.json()

    if (!requestId || !action) {
      return NextResponse.json({ error: "Missing requestId or action" }, { status: 400 })
    }

    // Verify the user has permission to perform this action
    const requestRef = doc(db, "requests", requestId)
    const requestSnap = await getDoc(requestRef)
    
    if (!requestSnap.exists()) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    const requestData = requestSnap.data()
    
    // Only the client who made the request can perform escrow actions
    if (requestData.clientId !== userId) {
      return NextResponse.json({ error: "Unauthorized action" }, { status: 403 })
    }

    // Rest of the escrow processing logic
    const escrowId = `escrow_${requestId}`
    const escrowRef = doc(db, "escrowAccounts", escrowId)
    const escrowSnap = await getDoc(escrowRef)
    
    if (!escrowSnap.exists()) {
      return NextResponse.json({ error: "Escrow account not found" }, { status: 404 })
    }

    const escrowData = escrowSnap.data()
    
    if (escrowData.status !== "held") {
      return NextResponse.json({ error: "Funds already processed" }, { status: 400 })
    }

    const batch = writeBatch(db)

    if (action === "release") {
      // Release to freelancer
      const freelancerRef = doc(db, "users", escrowData.freelancerId)
      batch.update(freelancerRef, {
        credits: increment(escrowData.amount)
      })

      // Update escrow status
      batch.update(escrowRef, {
        status: "released",
        releasedAt: new Date(),
        updatedAt: new Date()
      })

      // Create transaction record
      const transactionRef = doc(collection(db, "transactions"))
      batch.set(transactionRef, {
        userId: escrowData.freelancerId,
        requestId: escrowData.requestId,
        amount: escrowData.amount,
        currency: "USD",
        status: "completed",
        type: "escrow_release",
        description: `Escrow release for request ${escrowData.requestId}`,
        createdAt: new Date()
      })

      // Update request
      batch.update(requestRef, {
        paymentStatus: "paid",
        updatedAt: new Date()
      })
    } else if (action === "refund") {
      // Refund to client
      const clientRef = doc(db, "users", escrowData.clientId)
      batch.update(clientRef, {
        credits: increment(escrowData.amount)
      })

      // Update escrow status
      batch.update(escrowRef, {
        status: "refunded",
        refundedAt: new Date(),
        updatedAt: new Date()
      })

      // Create transaction record
      const transactionRef = doc(collection(db, "transactions"))
      batch.set(transactionRef, {
        userId: escrowData.clientId,
        requestId: escrowData.requestId,
        amount: escrowData.amount,
        currency: "USD",
        status: "completed",
        type: "escrow_refund",
        description: `Escrow refund for request ${escrowData.requestId}`,
        createdAt: new Date()
      })

      // Update request
      batch.update(requestRef, {
        paymentStatus: "refunded",
        updatedAt: new Date()
      })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    await batch.commit()

    return NextResponse.json({ 
      success: true,
      message: `Escrow ${action === "release" ? "released" : "refunded"} successfully`
    })

  } catch (error) {
    console.error("Error processing escrow:", error)
    
    if (error instanceof FirebaseError) {
      return NextResponse.json({ 
        error: "Database error",
        message: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      error: "Internal server error",
      message: "An unexpected error occurred"
    }, { status: 500 })
  }
}