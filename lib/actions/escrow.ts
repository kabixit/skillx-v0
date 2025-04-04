"use server"

import { db } from "@/lib/firebase/config"
import { doc, getDoc, updateDoc, writeBatch, increment, collection } from "firebase/firestore"
import { revalidatePath } from "next/cache"

export async function releaseEscrow(escrowId: string) {
  try {
    const escrowRef = doc(db, "escrowAccounts", escrowId)
    const escrowSnap = await getDoc(escrowRef)
    
    if (!escrowSnap.exists()) {
      throw new Error("Escrow account not found")
    }

    const escrowData = escrowSnap.data()
    
    if (escrowData.status !== "held") {
      throw new Error("Funds already processed")
    }

    const batch = writeBatch(db)

    // Release to freelancer
    const freelancerRef = doc(db, "users", escrowData.freelancerId)
    batch.update(freelancerRef, {
      credits: increment(escrowData.amount)
    })

    // Update escrow
    batch.update(escrowRef, {
      status: "released",
      releasedAt: new Date(),
      updatedAt: new Date()
    })

    // Create transaction
    const transactionRef = doc(collection(db, "transactions"))
    batch.set(transactionRef, {
      userId: escrowData.freelancerId,
      requestId: escrowData.requestId,
      amount: escrowData.amount,
      currency: "USD",
      status: "completed",
      type: "escrow_release",
      description: `Admin released escrow for request ${escrowData.requestId}`,
      createdAt: new Date()
    })

    // Update request
    const requestRef = doc(db, "requests", escrowData.requestId)
    batch.update(requestRef, {
      paymentStatus: "paid",
      updatedAt: new Date()
    })

    await batch.commit()

    revalidatePath("/admin/escrow")
    return { success: true, message: "Funds released successfully" }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function refundEscrow(escrowId: string) {
  try {
    const escrowRef = doc(db, "escrowAccounts", escrowId)
    const escrowSnap = await getDoc(escrowRef)
    
    if (!escrowSnap.exists()) {
      throw new Error("Escrow account not found")
    }

    const escrowData = escrowSnap.data()
    
    if (escrowData.status !== "held") {
      throw new Error("Funds already processed")
    }

    const batch = writeBatch(db)

    // Refund to client
    const clientRef = doc(db, "users", escrowData.clientId)
    batch.update(clientRef, {
      credits: increment(escrowData.amount)
    })

    // Update escrow
    batch.update(escrowRef, {
      status: "refunded",
      refundedAt: new Date(),
      updatedAt: new Date()
    })

    // Create transaction
    const transactionRef = doc(collection(db, "transactions"))
    batch.set(transactionRef, {
      userId: escrowData.clientId,
      requestId: escrowData.requestId,
      amount: escrowData.amount,
      currency: "USD",
      status: "completed",
      type: "escrow_refund",
      description: `Admin refunded escrow for request ${escrowData.requestId}`,
      createdAt: new Date()
    })

    // Update request
    const requestRef = doc(db, "requests", escrowData.requestId)
    batch.update(requestRef, {
      paymentStatus: "refunded",
      updatedAt: new Date()
    })

    await batch.commit()

    revalidatePath("/admin/escrow")
    return { success: true, message: "Funds refunded successfully" }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}