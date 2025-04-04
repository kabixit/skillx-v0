import { NextResponse } from 'next/server'
import { db } from "@/lib/firebase/config"
import { doc, updateDoc, increment, collection, addDoc } from "firebase/firestore"
import { getAuth } from "firebase-admin/auth"


export async function POST(request: Request) {
  try {
    const { userId, amount, transactionHash } = await request.json()

    // Validate input
    if (!userId || !amount || !transactionHash) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // In a real app, you would verify the transaction here
    // For example, using a blockchain API to confirm the transaction
    // const isValid = await verifyTransaction(transactionHash, amount)
    // if (!isValid) throw new Error("Invalid transaction")

    // Update user credits
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      credits: increment(amount),
      updatedAt: new Date()
    })

    // Create transaction record
    const transactionsRef = collection(db, "transactions")
    await addDoc(transactionsRef, {
      userId,
      amount,
      type: 'credit_purchase',
      description: `Purchased ${amount} credits`,
      status: 'completed',
      currency: 'USD',
      paymentMethod: 'MetaMask',
      transactionHash,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    return NextResponse.json({
      success: true,
      message: `Successfully added ${amount} credits`
    })

  } catch (error) {
    console.error("Error adding credits:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add credits" },
      { status: 500 }
    )
  }
}