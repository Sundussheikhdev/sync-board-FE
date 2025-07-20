export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawStroke {
  id: string;
  userId: string;
  userName: string;
  points: DrawPoint[];
  color: string;
  brushSize: number;
  timestamp: string;
}

export interface DrawData {
  x: number;
  y: number;
  color: string;
  brushSize: number;
  isDrawing: boolean;
  strokeId?: string; // For stroke-based drawing
}

export interface ChatMessage {
  userId: string;
  userName?: string;
  message: string;
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

export interface WebSocketMessage {
  type:
    | "draw"
    | "draw_stroke"
    | "stroke_start"
    | "stroke_point"
    | "stroke_end"
    | "chat"
    | "join"
    | "leave"
    | "user_joined"
    | "user_left"
    | "name_change"
    | "room_info"
    | "canvas_state"
    | "clear_canvas"
    | "heartbeat_response";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  timestamp: string;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private roomId: string;
  private userName?: string; // Store username for reconnections
  private onDraw?: (data: DrawData) => void;
  private onChat?: (data: ChatMessage) => void;
  private onUserJoinedCallback?: (userId: string, userName: string) => void;
  private onUserLeftCallback?: (userId: string, userName: string) => void;
  private onNameChangeCallback?: (
    userId: string,
    oldName: string,
    newName: string
  ) => void;
  private onRoomInfoCallback?: (roomInfo: {
    users?: Array<{ id: string; name?: string }>;
  }) => void;
  private onCanvasStateCallback?: (drawings: DrawStroke[]) => void;
  private onClearCanvasCallback?: () => void;
  private onStrokeStartCallback?: (stroke: DrawStroke) => void;
  private onStrokePointCallback?: (strokeId: string, point: DrawPoint) => void;
  private onStrokeEndCallback?: (strokeId: string) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = parseInt(
    process.env.NEXT_PUBLIC_WS_MAX_RECONNECT_ATTEMPTS || "5"
  );
  private isIntentionallyDisconnected = false; // Add flag to prevent reconnection

  // NEW: Heartbeat mechanism
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatIntervalMs = parseInt(
    process.env.NEXT_PUBLIC_WS_HEARTBEAT_INTERVAL || "60000"
  ); // Send heartbeat every 60 seconds (before 5-minute timeout)

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  connect(
    backendUrl: string = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(
      "https://",
      "wss://"
    ).replace("http://", "ws://") || "ws://localhost:8000",
    userName?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Reset intentional disconnect flag for new connections
        this.isIntentionallyDisconnected = false;
        this.reconnectAttempts = 0;

        // Store username for reconnections
        if (userName) {
          this.userName = userName;
        }

        const url = this.userName
          ? `${backendUrl}/ws/${this.roomId}?user_name=${encodeURIComponent(
              this.userName
            )}`
          : `${backendUrl}/ws/${this.roomId}`;

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.startHeartbeat(); // NEW: Start heartbeat when connected
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch {
            // Silently handle parsing errors
          }
        };

        this.ws.onclose = (event) => {
          // Stop heartbeat when connection closes
          this.stopHeartbeat();

          if (event.code === 4001) {
            alert(
              "Username is already taken. Please choose a different username."
            );
          } else if (event.code === 4004) {
            alert("Room does not exist. Please check the room name.");
          } else if (event.code === 4002) {
            // Don't reconnect for timeout - let the user refresh the page
            alert("Connection timeout. Please refresh the page to reconnect.");
          } else if (event.code === 1000) {
            // Normal closure - don't reconnect
          } else {
            // Other closure codes - attempt reconnection
            this.attemptReconnect(backendUrl);
          }
        };

        this.ws.onerror = () => {
          reject(new Error("WebSocket connection failed"));
        };
      } catch {
        reject(new Error("Failed to create WebSocket connection"));
      }
    });
  }

  private attemptReconnect(backendUrl: string) {
    // Don't reconnect if intentionally disconnected
    if (this.isIntentionallyDisconnected) {
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;

      const reconnectDelay = parseInt(
        process.env.NEXT_PUBLIC_WS_RECONNECT_DELAY || "1000"
      );
      setTimeout(() => {
        this.connect(backendUrl, this.userName).catch(() => {
          this.attemptReconnect(backendUrl);
        });
      }, reconnectDelay * this.reconnectAttempts);
    }
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case "draw":
        if (this.onDraw) {
          this.onDraw(message.data);
        }
        break;
      case "stroke_start":
        if (this.onStrokeStartCallback) {
          this.onStrokeStartCallback(message.data);
        }
        break;
      case "stroke_point":
        if (this.onStrokePointCallback) {
          this.onStrokePointCallback(message.data.strokeId, message.data.point);
        }
        break;
      case "stroke_end":
        if (this.onStrokeEndCallback) {
          this.onStrokeEndCallback(message.data.strokeId);
        }
        break;
      case "chat":
        if (this.onChat) {
          this.onChat(message.data);
        }
        break;
      case "user_joined":
        if (this.onUserJoinedCallback) {
          this.onUserJoinedCallback(
            message.data.user_id,
            message.data.user_name
          );
        }
        break;
      case "user_left":
        if (this.onUserLeftCallback) {
          this.onUserLeftCallback(message.data.user_id, message.data.user_name);
        }
        break;
      case "name_change":
        if (this.onNameChangeCallback) {
          this.onNameChangeCallback(
            message.data.user_id,
            message.data.old_name,
            message.data.new_name
          );
        }
        break;
      case "room_info":
        if (this.onRoomInfoCallback) {
          this.onRoomInfoCallback(message.data);
        }
        break;
      case "canvas_state":
        if (this.onCanvasStateCallback) {
          this.onCanvasStateCallback(message.data.drawings);
        }
        break;
      case "clear_canvas":
        if (this.onClearCanvasCallback) {
          this.onClearCanvasCallback();
        }
        break;
      case "heartbeat_response":
        // NEW: Handle heartbeat response (optional, for debugging)
        break;
      default:
      // Silently ignore unknown message types
    }
  }

  sendDraw(data: DrawData) {
    this.sendMessage("draw", data);
  }

  sendStrokeStart(stroke: DrawStroke) {
    this.sendMessage("stroke_start", stroke);
  }

  sendStrokePoint(strokeId: string, point: DrawPoint) {
    this.sendMessage("stroke_point", { strokeId, point });
  }

  sendStrokeEnd(strokeId: string) {
    this.sendMessage("stroke_end", { strokeId });
  }

  sendChat(data: ChatMessage) {
    this.sendMessage("chat", data);
  }

  sendJoin(userId: string) {
    this.sendMessage("join", { userId });
  }

  sendLeave(userId: string) {
    this.sendMessage("leave", { userId });
  }

  sendNameChange(newName: string) {
    // Update stored username for reconnections
    this.userName = newName;
    this.sendMessage("name_change", { new_name: newName });
  }

  sendClearCanvas() {
    this.sendMessage("clear_canvas", {});
  }

  getRoomInfo() {
    this.sendMessage("get_room_info", {});
  }

  private sendMessage(type: string, data: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  // Event handlers
  onDrawMessage(callback: (data: DrawData) => void) {
    this.onDraw = callback;
  }

  onChatMessage(callback: (data: ChatMessage) => void) {
    this.onChat = callback;
  }

  onUserJoined(callback: (userId: string, userName: string) => void) {
    this.onUserJoinedCallback = callback;
  }

  onUserLeft(callback: (userId: string, userName: string) => void) {
    this.onUserLeftCallback = callback;
  }

  onNameChange(
    callback: (userId: string, oldName: string, newName: string) => void
  ) {
    this.onNameChangeCallback = callback;
  }

  onRoomInfo(
    callback: (roomInfo: {
      users?: Array<{ id: string; name?: string }>;
    }) => void
  ) {
    this.onRoomInfoCallback = callback;
  }

  onCanvasState(callback: (drawings: DrawStroke[]) => void) {
    this.onCanvasStateCallback = callback;
  }

  onClearCanvas(callback: () => void) {
    this.onClearCanvasCallback = callback;
  }

  onStrokeStart(callback: (stroke: DrawStroke) => void) {
    this.onStrokeStartCallback = callback;
  }

  onStrokePoint(callback: (strokeId: string, point: DrawPoint) => void) {
    this.onStrokePointCallback = callback;
  }

  onStrokeEnd(callback: (strokeId: string) => void) {
    this.onStrokeEndCallback = callback;
  }

  disconnect() {
    this.isIntentionallyDisconnected = true;
    this.stopHeartbeat(); // NEW: Stop heartbeat when disconnecting
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // NEW: Getter method to access room ID
  getRoomId(): string {
    return this.roomId;
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage("heartbeat", {});
      } else {
        this.stopHeartbeat();
      }
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
