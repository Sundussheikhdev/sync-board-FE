"use client";

import { useState, useEffect } from "react";

interface Room {
  id: string;
  name: string;
  userCount: number;
  createdAt: string;
}

interface RoomListProps {
  userName: string;
  onJoinRoom: (roomId: string, roomName: string) => void;
  onCreateRoom: () => void;
  onChangeUsername: () => void;
  onLogout: () => void;
  lastRoomName?: string; // Add this to show rejoin option
}

export default function RoomList({
  userName,
  onJoinRoom,
  onCreateRoom,
  onChangeUsername,
  onLogout,
  lastRoomName,
}: RoomListProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch rooms from backend
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const response = await fetch(`${backendUrl}/rooms`);
        if (response.ok) {
          const data = await response.json();
          setRooms(data.rooms || []);
        } else {
          setError("Failed to fetch rooms");
        }
      } catch {
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();

    // Refresh rooms every configured interval
    const refreshInterval = parseInt(
      process.env.NEXT_PUBLIC_ROOM_REFRESH_INTERVAL || "10000"
    );
    const interval = setInterval(fetchRooms, refreshInterval);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-body">Loading rooms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <p className="text-body mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-heading-2">Collaborative Whiteboard</h1>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-body-small">
                  Connected as: {userName}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onChangeUsername}
                className="btn-primary text-sm"
              >
                Change Username
              </button>
              <button
                onClick={onCreateRoom}
                className="btn-success flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span>Create Room</span>
              </button>
              <button
                onClick={onLogout}
                className="btn-error text-sm flex items-center space-x-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-heading-1 mb-2">Available Rooms</h2>
          <p className="text-body-small">
            Join an existing room or create your own to start collaborating
          </p>
        </div>

        {/* Quick Rejoin Section */}
        {lastRoomName && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-heading-3 text-blue-900 mb-1">
                  Quick Rejoin
                </h3>
                <p className="text-body-small text-blue-700">
                  Rejoin your last room: <strong>{lastRoomName}</strong>
                </p>
              </div>
              <button
                onClick={() => {
                  // Find the room by name to get the correct roomId
                  const room = rooms.find((r) => r.name === lastRoomName);
                  if (room) {
                    onJoinRoom(room.id, room.name);
                  } else {
                    // If room not found, try to join with lastRoomName as ID (fallback)
                    onJoinRoom(lastRoomName, lastRoomName);
                  }
                }}
                className="btn-primary flex items-center space-x-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                <span>Rejoin Room</span>
              </button>
            </div>
          </div>
        )}

        {rooms.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-heading-3 mb-2">No rooms available</h3>
            <p className="text-body-small mb-6">
              Be the first to create a room and start collaborating!
            </p>
            <button onClick={onCreateRoom} className="btn-primary px-6 py-3">
              Create First Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`card-standard p-6 hover:shadow-md transition-shadow ${
                  room.name === lastRoomName
                    ? "ring-2 ring-blue-500 bg-blue-50"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-heading-3">{room.name}</h3>
                      {room.name === lastRoomName && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Last Room
                        </span>
                      )}
                    </div>
                    <p className="text-body-small">
                      Created {formatTime(room.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                      />
                    </svg>
                    <span>{room.userCount} online</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Active</span>
                  </div>
                  <button
                    onClick={() => onJoinRoom(room.id, room.name)}
                    className={`text-sm ${
                      room.name === lastRoomName ? "btn-primary" : "btn-primary"
                    }`}
                  >
                    {room.name === lastRoomName ? "Rejoin" : "Join Room"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
