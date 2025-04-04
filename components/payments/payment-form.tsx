"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { collection, addDoc, serverTimestamp, doc, updateDoc, writeBatch, increment, setDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-provider"
import { db } from "@/lib/firebase/config"
import type { ServiceRequest } from "@/types/service"
import { Loader2, CreditCard, Wallet } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const formSchema = z.object({
  paymentMethod: z.enum(["credit_card", "paypal", "credits"]),
  cardNumber: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvc: z.string().optional(),
})

interface PaymentFormProps {
  request: ServiceRequest
  onClose: () => void
  onSuccess?: () => void
}

export function PaymentForm({ request, onClose, onSuccess }: PaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { user, userData } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentMethod: "credit_card",
    },
  })

  const watchPaymentMethod = form.watch("paymentMethod")

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !userData) return

    if (values.paymentMethod === "credits" && userData.credits < request.budget) {
      toast({
        title: "Insufficient credits",
        description: "You don't have enough credits to complete this payment",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const batch = writeBatch(db)

      // Create escrow account
      const escrowId = `escrow_${request.id}`
      const escrowRef = doc(db, "escrowAccounts", escrowId)
      
      batch.set(escrowRef, {
        requestId: request.id,
        clientId: user.uid,
        freelancerId: request.serviceOwnerId,
        amount: request.budget,
        status: "held",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // Create payment transaction
      const paymentToEscrowData = {
        userId: user.uid,
        requestId: request.id,
        serviceId: request.serviceId,
        amount: request.budget,
        currency: "USD",
        status: "completed",
        type: "payment_to_escrow",
        paymentMethod: values.paymentMethod,
        description: `Payment to escrow for service: ${request.serviceName}`,
        createdAt: serverTimestamp(),
      }

      const paymentToEscrowRef = await addDoc(collection(db, "transactions"), paymentToEscrowData)

      // Update request
      const requestRef = doc(db, "requests", request.id)
      batch.update(requestRef, {
        paymentStatus: "in_escrow",
        paymentId: paymentToEscrowRef.id,
        escrowId: escrowId,
        updatedAt: serverTimestamp(),
      })

      if (values.paymentMethod === "credits") {
        // Deduct from client
        const clientRef = doc(db, "users", user.uid)
        batch.update(clientRef, {
          credits: increment(-request.budget)
        })
      }

      await batch.commit()

      // Notifications
      await Promise.all([
        addDoc(collection(db, "notifications"), {
          userId: request.serviceOwnerId,
          title: "Payment in Escrow",
          message: `Payment of $${request.budget} for "${request.serviceName}" has been secured`,
          type: "payment",
          read: false,
          createdAt: serverTimestamp(),
          linkTo: `/dashboard/requests/${request.id}`,
          relatedId: request.id,
        }),
        addDoc(collection(db, "notifications"), {
          userId: user.uid,
          title: "Payment Secured",
          message: `Your payment of $${request.budget} is safely held in escrow`,
          type: "payment",
          read: false,
          createdAt: serverTimestamp(),
          linkTo: `/dashboard/requests/${request.id}`,
          relatedId: request.id,
        })
      ])

      toast({
        title: "Payment secured in escrow!",
        description: "Your payment is safely held until you approve the work",
      })

      onClose()
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Payment failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Secure Payment in Escrow</DialogTitle>
          <DialogDescription>
            Your payment will be held securely until you approve the work.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-6 p-4 bg-muted rounded-md">
            <h3 className="font-medium mb-2">Order Summary</h3>
            <div className="flex justify-between mb-1">
              <span>{request.serviceName}</span>
              <span>${request.budget}</span>
            </div>
            <div className="flex justify-between font-medium text-lg mt-4 pt-4 border-t">
              <span>Total</span>
              <span>${request.budget}</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              <p>Funds will be released to the freelancer only after you approve the work.</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="credit_card" id="credit_card" />
                          <label htmlFor="credit_card" className="flex items-center cursor-pointer">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Credit Card
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="paypal" id="paypal" />
                          <label htmlFor="paypal" className="flex items-center cursor-pointer">
                            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19.5 8.5H18.5C18.5 5.74 16.26 3.5 13.5 3.5H7.5C6.12 3.5 5 4.62 5 6V18C5 19.1 5.9 20 7 20H12C13.66 20 15 18.66 15 17V13.5H19.5C20.88 13.5 22 12.38 22 11V11C22 9.62 20.88 8.5 19.5 8.5Z" fill="currentColor" />
                              <path d="M15 8.5H16.5C17.05 8.5 17.5 8.95 17.5 9.5V10C17.5 10.55 17.05 11 16.5 11H15V8.5Z" fill="currentColor" />
                            </svg>
                            PayPal
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value="credits" 
                            id="credits" 
                            disabled={userData?.credits < request.budget}
                          />
                          <label 
                            htmlFor="credits" 
                            className={`flex items-center cursor-pointer ${userData?.credits < request.budget ? 'opacity-50' : ''}`}
                          >
                            <Wallet className="h-4 w-4 mr-2" />
                            SkillX Credits ({userData?.credits || 0} available)
                            {userData?.credits < request.budget && " (Insufficient)"}
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchPaymentMethod === "credit_card" && (
                <>
                  <FormField
                    control={form.control}
                    name="cardNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card Number</FormLabel>
                        <FormControl>
                          <Input placeholder="4242 4242 4242 4242" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cardExpiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date</FormLabel>
                          <FormControl>
                            <Input placeholder="MM/YY" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cardCvc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CVC</FormLabel>
                          <FormControl>
                            <Input placeholder="123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-4 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay $${request.budget} to Escrow`
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}