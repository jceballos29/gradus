"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { createGradusClient, Notification } from "@/lib/gradus-api";

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  connected: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationContext must be inside NotificationProvider");
  return ctx;
}

interface Props {
  children: ReactNode;
  azureOid: string;
  accessToken: string;
  initialNotifications: Notification[];
}

export function NotificationProvider({
  children,
  azureOid,
  accessToken,
  initialNotifications,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    connected,
    markAsReadLocally,
    markAllAsReadLocally,
  } = useNotifications({ azureOid, accessToken, initialNotifications });

  async function markAsRead(id: string) {
    try {
      const api = createGradusClient(accessToken);
      await api.markNotificationAsRead(id);
      markAsReadLocally(id);
    } catch {
      // Fallo silencioso — el estado local ya se actualizó
    }
  }

  async function markAllAsRead() {
    try {
      const api = createGradusClient(accessToken);
      await api.markAllNotificationsAsRead();
      markAllAsReadLocally();
    } catch {}
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        connected,
        markAsRead,
        markAllAsRead,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}