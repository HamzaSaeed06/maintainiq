import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const user = useAuthStore(state => state.user);

  // Debug: Log user data
  useEffect(() => {
    console.log('[useSocket] User data changed:', user);
    console.log('[useSocket] User ID:', user?._id);
    console.log('[useSocket] User role:', user?.role);
  }, [user]);

  const connectSocket = useCallback(() => {
    if (!user) {
      console.log('[useSocket] No user found, skipping connection');
      return null;
    }

    console.log('[useSocket] Connecting to socket at:', SOCKET_URL);
    console.log('[useSocket] User ID for room joining:', user._id);
    console.log('[useSocket] User role:', user.role);
    
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketInstance.on('connect', () => {
      console.log('[useSocket] Socket connected:', socketInstance.id);
      setIsConnected(true);

      // Join appropriate rooms based on user role
      socketInstance.emit('join', user._id);
      console.log('[useSocket] Joined user room:', `user_${user._id}`);
      
      if (user.role === 'admin') {
        socketInstance.emit('join-admin');
        console.log('[useSocket] Joined admin room');
      } else if (user.role === 'technician') {
        socketInstance.emit('join-technician', user._id);
        console.log('[useSocket] Joined technician room:', `technician_${user._id}`);
        
        // Listen for room join confirmation
        socketInstance.on('room-joined', (data) => {
          console.log('[useSocket] Room join confirmation received:', data);
        });
        
        // Listen for assignment events specifically for technicians
        socketInstance.on('issue:assigned', (data) => {
          console.log('[useSocket] Technician received issue:assigned event:', data);
        });
      } else {
        console.log('[useSocket] Unknown user role:', user.role);
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[useSocket] Socket disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[useSocket] Socket connection error:', error);
      setIsConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('[useSocket] Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log('[useSocket] Reconnection attempt:', attemptNumber);
    });

    setSocket(socketInstance);

    return socketInstance;
  }, [user]);

  const disconnectSocket = useCallback((socketInstance) => {
    if (socketInstance) {
      console.log('useSocket: Disconnecting socket');
      socketInstance.disconnect();
    }
  }, []);

  useEffect(() => {
    const socketInstance = connectSocket();
    
    return () => {
      disconnectSocket(socketInstance);
    };
  }, [connectSocket, disconnectSocket]);

  // Event listener helper
  const onEvent = useCallback((event, callback) => {
    if (!socket) {
      console.log('[useSocket] No socket available for event:', event);
      return;
    }
    
    console.log('[useSocket] Listening for event:', event);
    socket.on(event, callback);
    
    return () => {
      socket.off(event, callback);
    };
  }, [socket]);

  return { socket, isConnected, onEvent };
};
