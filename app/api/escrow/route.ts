import { NextResponse } from 'next/server'
import { db } from "@/lib/firebase/config"
import { doc, getDoc, updateDoc, writeBatch, increment, collection } from "firebase/firestore"
import { FirebaseError } from "firebase/app"

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { requestId, action } = await request.json()

    // Validate input
    if (!requestId || !action) {
      return NextResponse.json(
        { error: "Bad Request", message: "Missing requestId or action" },
        { status: 400 }
      )
    }

    // Get request data
    const requestRef = doc(db, "requests", requestId)
    const requestSnap = await getDoc(requestRef)

    if (!requestSnap.exists()) {
      return NextResponse.json(
        { error: "Not Found", message: "Request not found" },
        { status: 404 }
      )
    }

    const requestData = requestSnap.data()

    // Get escrow account
    const escrowId = `escrow_${requestId}`
    const escrowRef = doc(db, "escrowAccounts", escrowId)
    const escrowSnap = await getDoc(escrowRef)

    if (!escrowSnap.exists()) {
      return NextResponse.json(
        { error: "Not Found", message: "Escrow account not found" },
        { status: 404 }
      )
    }

    const escrowData = escrowSnap.data()

    // Check escrow status
    if (escrowData.status !== "held") {
      return NextResponse.json(
        { error: "Bad Request", message: "Funds already processed" },
        { status: 400 }
      )
    }

    const batch = writeBatch(db)

    if (action === "release") {
      // Release funds to freelancer
      const freelancerRef = doc(db, "users", escrowData.freelancerId)
      batch.update(freelancerRef, {
        credits: increment(escrowData.amount)
      })

      batch.update(escrowRef, {
        status: "released",
        releasedAt: new Date(),
        updatedAt: new Date()
      })

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

      batch.update(escrowRef, {
        status: "refunded",
        refundedAt: new Date(),
        updatedAt: new Date()
      })

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

      batch.update(requestRef, {
        paymentStatus: "refunded",
        updatedAt: new Date()
      })

    } else {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid action" },
        { status: 400 }
      )
    }

    await batch.commit()

    return NextResponse.json({
      success: true,
      message: `Escrow ${action === "release" ? "released" : "refunded"} successfully`,
      data: {
        amount: escrowData.amount,
        requestId: requestId
      }
    }, { status: 200 })

  } catch (error) {
    console.error("Error processing escrow:", error)

    if (error instanceof FirebaseError) {
      return NextResponse.json(
        {
          error: "Database Error",
          message: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "An unexpected error occurred"
      },
      { status: 500 }
    )
  }
}
