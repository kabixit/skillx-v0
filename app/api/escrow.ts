import { NextResponse } from 'next/server';
import { db } from "@/lib/firebase/config";
import { doc, getDoc, writeBatch, increment, collection } from "firebase/firestore";
import { getAuth } from "firebase-admin/auth";
import { initializeFirebaseAdmin } from "@/lib/firebase/admin";

// Initialize Firebase Admin
initializeFirebaseAdmin();

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Verify authentication
    const authToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authToken) {
      console.error('Authentication token missing');
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify user token
    const decodedToken = await getAuth().verifyIdToken(authToken);
    const { uid } = decodedToken;
    console.log(`Authenticated user: ${uid}`);

    const { requestId, action } = await request.json();
    console.log(`Processing ${action} for request ${requestId}`);

    // Validate input
    if (!requestId || !action || !["release", "refund"].includes(action)) {
      console.error('Invalid parameters:', { requestId, action });
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    // Get request and escrow data
    const requestRef = doc(db, "requests", requestId);
    const escrowRef = doc(db, "escrowAccounts", `escrow_${requestId}`);
    
    const [requestSnap, escrowSnap] = await Promise.all([
      getDoc(requestRef),
      getDoc(escrowRef)
    ]);

    if (!requestSnap.exists()) {
      console.error(`Request not found: ${requestId}`);
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    if (!escrowSnap.exists()) {
      console.error(`Escrow account not found for request: ${requestId}`);
      return NextResponse.json(
        { error: "Escrow account not found" },
        { status: 404 }
      );
    }

    const requestData = requestSnap.data();
    const escrowData = escrowSnap.data();

    // Validate escrow status
    if (escrowData.status !== "held") {
      console.error(`Escrow already processed. Current status: ${escrowData.status}`);
      return NextResponse.json(
        { error: "Escrow funds already processed" },
        { status: 400 }
      );
    }

    // Validate request status (only allow after delivery)
    if (requestData.status !== "delivered") {
      console.error(`Request not delivered. Current status: ${requestData.status}`);
      return NextResponse.json(
        { error: "Can only process escrow after delivery" },
        { status: 400 }
      );
    }

    // Prepare batch operation
    const batch = writeBatch(db);
    const now = new Date();
    const amount = escrowData.amount;
    const recipientId = action === "release" ? escrowData.freelancerId : escrowData.clientId;

    // Update recipient's balance
    batch.update(doc(db, "users", recipientId), {
      credits: increment(amount),
      updatedAt: now
    });

    // Update escrow status
    batch.update(escrowRef, {
      status: action === "release" ? "released" : "refunded",
      updatedAt: now,
      [action === "release" ? "releasedAt" : "refundedAt"]: now
    });

    // Create transaction record
    const transactionRef = doc(collection(db, "transactions"));
    batch.set(transactionRef, {
      userId: recipientId,
      requestId,
      amount,
      currency: "USD",
      status: "completed",
      type: `escrow_${action}`,
      description: `Escrow ${action} for ${requestData.serviceName}`,
      createdAt: now,
      updatedAt: now
    });

    // Update request status
    batch.update(requestRef, {
      paymentStatus: action === "release" ? "paid" : "refunded",
      updatedAt: now
    });

    // Execute batch
    await batch.commit();
    console.log(`Successfully processed ${action} for request ${requestId}`);

    return NextResponse.json({
      success: true,
      message: `Escrow ${action} completed successfully`,
      amount,
      requestId,
      newStatus: action === "release" ? "released" : "refunded"
    });

  } catch (error) {
    console.error("Error in escrow processing:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}