"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { useAuth } from "@/lib/auth/auth-provider"
import type { Notification } from "@/types/service"
import { useToast } from "@/components/ui/use-toast"

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: true,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
})

export const useNotifications = () => useContext(NotificationContext)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    setLoading(true)

    // Query for the user's notifications, ordered by creation date
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(50), // Limit to the 50 most recent notifications
    )

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notificationsData: Notification[] = []
        snapshot.forEach((doc) => {
          notificationsData.push({ id: doc.id, ...doc.data() } as Notification)
        })

        setNotifications(notificationsData)
        setUnreadCount(notificationsData.filter((notification) => !notification.read).length)
        setLoading(false)

        // Show toast for new notifications
        const newNotifications = notificationsData.filter(
          (notification) => !notification.read && notification.createdAt?.seconds > Date.now() / 1000 - 10,
        )

        if (newNotifications.length > 0) {
          // Only show toast for the most recent notification
          const latestNotification = newNotifications[0]
          toast({
            title: latestNotification.title,
            description: latestNotification.message,
          })
        }
      },
      (error) => {
        console.error("Error fetching notifications:", error)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [user, toast])

  const markAsRead = async (notificationId: string) => {
    if (!user) return

    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      const unreadNotifications = notifications.filter((notification) => !notification.read)

      // Update each unread notification
      const updatePromises = unreadNotifications.map((notification) =>
        updateDoc(doc(db, "notifications", notification.id), {
          read: true,
        }),
      )

      await Promise.all(updatePromises)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

