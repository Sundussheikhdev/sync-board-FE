"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Whiteboard from "../components/Whiteboard";
import Chat from "../components/Chat";
import UserNameEntry from "../components/UserNameEntry";
import RoomList from "../components/RoomList";
import CreateRoom from "../components/CreateRoom";
import {
  WebSocketManager,
  DrawData,
  DrawStroke,
  DrawPoint,
} from "../utils/websocket";

interface ChatMessage {
  userId: string;
  userName?: string;
  message: string;
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

interface OnlineUser {
  id: string;
  name: string;
}

type AppState =
  | "username"
  | "rooms"
  | "create-room"
  | "in-room"
  | "change-username";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("username");
  const [userName, setUserName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomId, setRoomId] = useState(""); // Add room ID state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null);

  // Refs for canvas callbacks
  const remoteDrawCallbackRef = useRef<((data: DrawData) => void) | null>(null);
  const remoteStrokeStartCallbackRef = useRef<
    ((stroke: DrawStroke) => void) | null
  >(null);
  const remoteStrokePointCallbackRef = useRef<
    ((strokeId: string, point: DrawPoint) => void) | null
  >(null);
  const remoteStrokeEndCallbackRef = useRef<
    ((strokeId: string) => void) | null
  >(null);
  const canvasStateCallbackRef = useRef<
    ((drawings: DrawStroke[]) => void) | null
  >(null);
  const clearCanvasCallbackRef = useRef<(() => void) | null>(null);

  // Load username from localStorage on component mount
  useEffect(() => {
    const storedUserName = localStorage.getItem("collaborative-app-username");
    if (storedUserName) {
      // Check if the stored username is still available
      const checkStoredUsername = async () => {
        try {
          const backendUrl =
            process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
          const response = await fetch(`${backendUrl}/users/check`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: storedUserName,
              current_username: storedUserName,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.available) {
              setUserName(storedUserName);
              setAppState("rooms"); // Skip username entry if we have a stored name
            } else {
              // Username is taken, remove from localStorage and show username entry
              localStorage.removeItem("collaborative-app-username");
              setAppState("username");
            }
          } else {
            // If check fails, assume username is available
            setUserName(storedUserName);
            setAppState("rooms");
          }
        } catch (error) {
          console.error("Error checking stored username:", error);
          // If check fails, assume username is available
          setUserName(storedUserName);
          setAppState("rooms");
        }
      };

      checkStoredUsername();
    }
  }, []);

  // Handle user name submission
  const handleNameSubmit = useCallback((name: string) => {
    setUserName(name);
    // Save username to localStorage for persistence
    localStorage.setItem("collaborative-app-username", name);
    setAppState("rooms");
  }, []);

  // Handle joining a room
  const handleJoinRoom = useCallback((roomId: string, roomName: string) => {
    // Store both roomId (for WebSocket) and roomName (for display)
    setRoomId(roomId); // Firestore document ID for WebSocket connections
    setRoomName(roomName); // Display name for UI
    setAppState("in-room");
  }, []);

  // Handle creating a room
  const handleCreateRoom = useCallback(() => {
    setAppState("create-room");
  }, []);

  // Handle room creation completion
  const handleRoomCreated = useCallback((roomId: string) => {
    setRoomId(roomId); // Store the actual room_id from Firestore
    setRoomName(roomId); // For now, use room_id as display name too
    setAppState("in-room");
  }, []);

  // Handle going back to room list
  const handleBackToRooms = useCallback(() => {
    setAppState("rooms");
  }, []);

  // Handle leaving the room (but staying logged in)
  const handleLeaveRoom = useCallback(() => {
    if (wsManager) {
      // Send leave message before disconnecting
      wsManager.sendLeave("current-user");
      // Small delay to ensure the message is sent
      setTimeout(() => {
        wsManager.disconnect();
      }, parseInt(process.env.NEXT_PUBLIC_ROOM_REFRESH_INTERVAL || "10000"));
    }
    // Keep the username and go back to rooms list
    setAppState("rooms");
    setMessages([]);
    setOnlineUsers([]);
    setIsConnected(false);
    setWsManager(null);
    setRoomId(""); // Clear room ID
    // Don't clear the room name so user can rejoin if needed
  }, [wsManager]);

  // Handle completely logging out
  const handleLogout = useCallback(() => {
    if (wsManager) {
      wsManager.disconnect();
    }
    // Clear local storage and reset all state
    localStorage.removeItem("collaborative-app-username");
    setUserName("");
    setAppState("username");
    setMessages([]);
    setOnlineUsers([]);
    setRoomName("");
    setRoomId(""); // Clear room ID
    setIsConnected(false);
    setWsManager(null);
  }, [wsManager]);

  // Handle changing username
  const handleChangeUsername = useCallback(() => {
    setAppState("change-username");
  }, []);

  // Handle username change completion
  const handleUsernameChanged = useCallback(
    async (newName: string) => {
      try {
        // Call backend to change username
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const response = await fetch(`${backendUrl}/users/change-username`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            old_username: userName,
            new_username: newName,
          }),
        });

        if (response.ok) {
          setUserName(newName);
          // Update localStorage with new username
          localStorage.setItem("collaborative-app-username", newName);

          // Notify other users in the room about the name change
          if (wsManager) {
            wsManager.sendNameChange(newName);
          }

          // Go back to the rooms list
          setAppState("rooms");
        } else {
          const errorData = await response.json();
          console.error("Failed to change username:", errorData);
          alert(
            `Failed to change username: ${errorData.detail || "Unknown error"}`
          );
        }
      } catch (error) {
        console.error("Error changing username:", error);
        alert("Error changing username. Please try again.");
      }
    },
    [userName]
  );

  const handleSendMessage = useCallback(
    (message: string) => {
      if (wsManager) {
        const chatMessage: ChatMessage = {
          userId: "current-user",
          userName: userName,
          message: message,
          timestamp: new Date().toISOString(),
        };

        // Add to local messages immediately for instant feedback
        setMessages((prev) => [...prev, chatMessage]);

        // Send via WebSocket
        wsManager.sendChat(chatMessage);
      } else {
      }
    },
    [wsManager, userName]
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!isConnected) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const response = await fetch(`${backendUrl}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const result = await response.json();

        if (result.success && wsManager) {
          const chatMessage: ChatMessage = {
            userId: "current-user",
            userName: userName,
            message: `Shared: ${file.name}`,
            timestamp: new Date().toISOString(),
            fileUrl: result.file_url,
            fileName: file.name,
            fileType: file.type,
          };

          // Add to local messages immediately for instant feedback
          setMessages((prev) => [...prev, chatMessage]);

          // Send via WebSocket
          wsManager.sendChat(chatMessage);
        }
      } catch (error) {
        throw error;
      }
    },
    [isConnected, wsManager, userName]
  );

  const loadChatHistory = useCallback(async (roomId: string) => {
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const messageLimit = process.env.NEXT_PUBLIC_CHAT_MESSAGE_LIMIT || "100";
      const response = await fetch(
        `${backendUrl}/rooms/${roomId}/messages?limit=${messageLimit}`
      );

      if (response.ok) {
        const data = await response.json();
        const messages = data.messages || [];

        // Convert the messages to the format expected by the frontend
        const formattedMessages: ChatMessage[] = messages.map(
          (msg: {
            user_id?: string;
            userId?: string;
            user_name?: string;
            userName?: string;
            message?: string;
            timestamp?: string;
            file_url?: string;
            fileUrl?: string;
            file_name?: string;
            fileName?: string;
            file_type?: string;
            fileType?: string;
          }) => {
            // Infer file type from file extension if not provided
            let fileType = msg.file_type || msg.fileType;
            if (!fileType && msg.file_name) {
              const fileName = msg.file_name.toLowerCase();
              if (
                fileName.endsWith(".jpg") ||
                fileName.endsWith(".jpeg") ||
                fileName.endsWith(".png") ||
                fileName.endsWith(".gif") ||
                fileName.endsWith(".webp") ||
                fileName.endsWith(".bmp") ||
                fileName.endsWith(".svg")
              ) {
                fileType = "image/" + fileName.split(".").pop();
              } else if (fileName.endsWith(".pdf")) {
                fileType = "application/pdf";
              }
            }

            return {
              userId: msg.user_id || msg.userId || "unknown",
              userName: msg.user_name || msg.userName || "Unknown User",
              message: msg.message || "",
              timestamp: msg.timestamp || new Date().toISOString(),
              fileUrl: msg.file_url || msg.fileUrl,
              fileName: msg.file_name || msg.fileName,
              fileType: fileType,
            };
          }
        );

        // Add a debug message to the chat showing how many messages were loaded
        if (formattedMessages.length > 0) {
          const debugMessage: ChatMessage = {
            userId: "system",
            userName: "System",
            message: `📥 Loaded ${formattedMessages.length} previous messages`,
            timestamp: new Date().toISOString(),
          };
          setMessages([debugMessage, ...formattedMessages]);
        } else {
          setMessages(formattedMessages);
        }
      } else {
      }
    } catch {
      // Handle error silently
    }
  }, []);

  useEffect(() => {
    if (appState !== "in-room" || !userName || !roomId) return;

    // Prevent creating multiple WebSocket managers for the same room
    if (wsManager && wsManager.getRoomId() === roomId) {
      return;
    }

    // Clean up existing WebSocket manager if it exists
    if (wsManager) {
      wsManager.disconnect();
    }

    const manager = new WebSocketManager(roomId);

    // Load chat history when joining the room (use roomId for consistency with WebSocket)
    loadChatHistory(roomId);

    // Set up event handlers
    manager.onDrawMessage((data: DrawData) => {
      if (remoteDrawCallbackRef.current) {
        remoteDrawCallbackRef.current(data);
      }
    });

    manager.onStrokeStart((stroke: DrawStroke) => {
      if (remoteStrokeStartCallbackRef.current) {
        remoteStrokeStartCallbackRef.current(stroke);
      }
    });

    manager.onStrokePoint((strokeId: string, point: DrawPoint) => {
      if (remoteStrokePointCallbackRef.current) {
        remoteStrokePointCallbackRef.current(strokeId, point);
      }
    });

    manager.onStrokeEnd((strokeId: string) => {
      if (remoteStrokeEndCallbackRef.current) {
        remoteStrokeEndCallbackRef.current(strokeId);
      }
    });

    manager.onChatMessage((message: ChatMessage) => {
      // Check if this message is already in the messages array to avoid duplicates
      setMessages((prev) => {
        // Check for duplicates based on time window (within 2 seconds) and content
        const isDuplicate = prev.some((existingMessage) => {
          const sameContent = existingMessage.message === message.message;
          const sameUser = existingMessage.userName === message.userName;

          // Check if timestamps are within 2 seconds of each other
          const messageTime = new Date(message.timestamp).getTime();
          const existingTime = new Date(existingMessage.timestamp).getTime();
          const timeDiff = Math.abs(messageTime - existingTime);
          const duplicateTimeWindow = parseInt(
            process.env.NEXT_PUBLIC_CHAT_DUPLICATE_TIME_WINDOW || "2000"
          );
          const isWithinTimeWindow = timeDiff < duplicateTimeWindow;

          // Check for local messages that might have been sent by current user
          const isLocalMessage =
            (message.userId === "current-user" ||
              existingMessage.userId === "current-user") &&
            sameContent &&
            sameUser &&
            isWithinTimeWindow;

          return (
            (sameContent && sameUser && isWithinTimeWindow) || isLocalMessage
          );
        });

        if (isDuplicate) {
          return prev; // Don't add duplicate
        }

        const newMessages = [...prev, message];
        return newMessages;
      });
    });

    manager.onUserJoined((userId: string, userName: string) => {
      setOnlineUsers((prev) => [...prev, { id: userId, name: userName }]);
    });

    manager.onUserLeft((userId: string) => {
      setOnlineUsers((prev) => prev.filter((user) => user.id !== userId));
    });

    manager.onNameChange(
      (changedUserId: string, oldName: string, newName: string) => {
        setOnlineUsers((prev) =>
          prev.map((user) =>
            user.id === changedUserId ? { ...user, name: newName } : user
          )
        );
      }
    );

    manager.onRoomInfo(
      (roomInfo: { users?: Array<{ id: string; name?: string }> }) => {
        // Update online users from room info
        if (roomInfo.users && Array.isArray(roomInfo.users)) {
          const users = roomInfo.users.map((user) => ({
            id: user.id,
            name: user.name || `User ${user.id}`,
          }));
          setOnlineUsers(users);
        }
      }
    );

    manager.onCanvasState((drawings: DrawStroke[]) => {
      if (canvasStateCallbackRef.current) {
        canvasStateCallbackRef.current(drawings);
      }
    });

    manager.onClearCanvas(() => {
      if (clearCanvasCallbackRef.current) {
        clearCanvasCallbackRef.current();
      }
    });

    setWsManager(manager);

    // Connect to WebSocket
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const wsUrl = backendUrl
      .replace("https://", "wss://")
      .replace("http://", "ws://");
    manager
      .connect(wsUrl, userName)
      .then(() => {
        setIsConnected(true);
      })
      .catch(() => {
        setIsConnected(false);
      });

    return () => {
      manager.disconnect();
    };
  }, [appState, userName, roomId, loadChatHistory]); // Use roomId for WebSocket connections

  // Render different components based on app state
  switch (appState) {
    case "username":
      return <UserNameEntry onNameSubmit={handleNameSubmit} />;

    case "rooms":
      return (
        <RoomList
          userName={userName}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
          onChangeUsername={handleChangeUsername}
          onLogout={handleLogout}
          lastRoomName={roomName}
        />
      );

    case "create-room":
      return (
        <CreateRoom
          userName={userName}
          onRoomCreated={handleRoomCreated}
          onBack={handleBackToRooms}
        />
      );

    case "change-username":
      return (
        <UserNameEntry
          onNameSubmit={handleUsernameChanged}
          initialValue={userName}
          title="Change Username"
          submitButtonText="Update Username"
          onBack={() => setAppState("in-room")}
          currentUsername={userName}
        />
      );

    case "in-room":
      return (
        <div className="h-screen flex flex-col bg-gray-50">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-heading-2">Collaborative Whiteboard</h1>
              <div className="flex items-center space-x-4">
                <div className="text-body-small">
                  Room: {roomName} | You: {userName} | Users:{" "}
                  {onlineUsers.length}
                </div>
                <button onClick={handleLeaveRoom} className="btn-error text-sm">
                  Leave Room
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Whiteboard */}
            <div className="flex-1 bg-white">
              <Whiteboard
                onStrokeStart={(stroke) => {
                  if (wsManager) {
                    wsManager.sendStrokeStart(stroke);
                  }
                }}
                onStrokePoint={(strokeId, point) => {
                  if (wsManager) {
                    wsManager.sendStrokePoint(strokeId, point);
                  }
                }}
                onStrokeEnd={(strokeId) => {
                  if (wsManager) {
                    wsManager.sendStrokeEnd(strokeId);
                  }
                }}
                onRemoteDraw={(callback) => {
                  remoteDrawCallbackRef.current = callback;
                }}
                onRemoteStrokeStart={(callback) => {
                  remoteStrokeStartCallbackRef.current = callback;
                }}
                onRemoteStrokePoint={(callback) => {
                  remoteStrokePointCallbackRef.current = callback;
                }}
                onRemoteStrokeEnd={(callback) => {
                  remoteStrokeEndCallbackRef.current = callback;
                }}
                onClearCanvas={() => {
                  if (wsManager) {
                    wsManager.sendClearCanvas();
                  }
                }}
                onCanvasState={(callback) => {
                  canvasStateCallbackRef.current = callback;
                }}
                onClearCanvasRemote={(callback) => {
                  clearCanvasCallbackRef.current = callback;
                }}
                isConnected={isConnected}
                currentUserId="current-user"
                currentUserName={userName}
              />
            </div>

            {/* Chat */}
            <div className="w-80 bg-white border-l border-gray-200">
              <Chat
                messages={messages}
                onSendMessage={handleSendMessage}
                onFileUpload={handleFileUpload}
                isConnected={isConnected}
                onlineUsers={onlineUsers.map((user) => user.name)}
                currentUserName={userName}
              />
            </div>
          </div>
        </div>
      );

    default:
      return <UserNameEntry onNameSubmit={handleNameSubmit} />;
  }
}
