"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as signalR from "@microsoft/signalr"
import { Notification } from "@/lib/gradus-api"

interface UseNotificationsOptions {
  azureOid: string
  accessToken: string
  initialNotifications?: Notification[]
}

export function useNotifications({
  azureOid,
  accessToken,
  initialNotifications = [],
}: UseNotificationsOptions) {
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications)
  const [connected, setConnected] = useState(false)
  const connectionRef = useRef<signalR.HubConnection | null>(null)

  const apiUrl =
    process.env.NEXT_PUBLIC_GRADUS_API_URL ?? "http://localhost:5002"

  // Agrega una notificación nueva al inicio de la lista
  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev])
  }, [])

  // Marca una notificación como leída localmente
  const markAsReadLocally = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }, [])

  // Marca todas como leídas localmente
  const markAllAsReadLocally = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }, [])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Conexión SignalR
  useEffect(() => {
    if (!azureOid || !accessToken) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiUrl}/hubs/notifications`, {
        accessTokenFactory: () => accessToken,
        // Fallback a long polling si WebSockets no está disponible
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connectionRef.current = connection

    // Escuchar notificaciones entrantes
    connection.on("ReceiveNotification", (payload: Notification) => {
      addNotification(payload)
    })

    connection.onreconnecting(() => {
      setConnected(false)
    })

    connection.onreconnected(() => {
      setConnected(true)
      // Re-registrar el usuario tras reconexión
      connection.invoke("RegisterUser", azureOid).catch(console.warn)
    })

    connection.onclose(() => {
      setConnected(false)
    })

    // Iniciar conexión
    connection
      .start()
      .then(() => {
        setConnected(true)
        // Registrar el usuario en su grupo personal
        return connection.invoke("RegisterUser", azureOid)
      })
      .catch((err) => {
        console.warn("SignalR connection failed:", err)
      })

    return () => {
      connection.stop().catch(() => {})
    }
  }, [azureOid, accessToken, apiUrl, addNotification])

  return {
    notifications,
    unreadCount,
    connected,
    addNotification,
    markAsReadLocally,
    markAllAsReadLocally,
  }
}
