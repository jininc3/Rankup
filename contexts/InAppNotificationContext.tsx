import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

export interface InAppNotificationData {
  id: string;
  type: 'follow' | 'like' | 'comment' | 'tag' | 'message' | 'party_invite' | 'party_complete' | 'party_ranking_change';
  fromUserId: string;
  fromUsername: string;
  fromUserAvatar?: string;
  postId?: string;
  postThumbnail?: string;
  chatId?: string;
  partyId?: string;
  game?: string;
  message: string;
  navigationData: any;
}

interface InAppNotificationContextType {
  showNotification: (data: InAppNotificationData) => void;
  dismissNotification: () => void;
  activeNotification: InAppNotificationData | null;
  isVisible: boolean;
}

const InAppNotificationContext = createContext<InAppNotificationContextType | undefined>(undefined);

export function InAppNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notificationQueue, setNotificationQueue] = useState<InAppNotificationData[]>([]);
  const [activeNotification, setActiveNotification] = useState<InAppNotificationData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDismissingRef = useRef(false);

  const startDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    dismissTimerRef.current = setTimeout(() => {
      dismissNotification();
    }, 4000); // 4 seconds display time
  }, []);

  const showNotification = useCallback((data: InAppNotificationData) => {
    if (activeNotification && !isDismissingRef.current) {
      // Queue if notification is already showing
      setNotificationQueue(prev => [...prev, data]);
    } else {
      // Show immediately
      setActiveNotification(data);
      setIsVisible(true);
      isDismissingRef.current = false;
      startDismissTimer();
    }
  }, [activeNotification, startDismissTimer]);

  const dismissNotification = useCallback(() => {
    if (isDismissingRef.current) return; // Prevent multiple dismissals

    isDismissingRef.current = true;

    // Clear timer
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    // Hide notification
    setIsVisible(false);

    // After animation completes (300ms), show next notification
    setTimeout(() => {
      setActiveNotification(null);
      isDismissingRef.current = false;

      // Check if there are queued notifications
      setNotificationQueue(prev => {
        if (prev.length > 0) {
          const [next, ...rest] = prev;
          // Show next notification
          setTimeout(() => {
            showNotification(next);
          }, 100); // Small delay between notifications
          return rest;
        }
        return prev;
      });
    }, 300);
  }, [showNotification]);

  const value = {
    showNotification,
    dismissNotification,
    activeNotification,
    isVisible,
  };

  return (
    <InAppNotificationContext.Provider value={value}>
      {children}
    </InAppNotificationContext.Provider>
  );
}

export function useInAppNotification() {
  const context = useContext(InAppNotificationContext);
  if (context === undefined) {
    throw new Error('useInAppNotification must be used within InAppNotificationProvider');
  }
  return context;
}
