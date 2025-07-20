"use client";

import { useState } from "react";

interface CreateRoomProps {
  userName: string;
  onRoomCreated: (roomName: string) => void;
  onBack: () => void;
}

export default function CreateRoom({
  userName,
  onRoomCreated,
  onBack,
}: CreateRoomProps) {
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const generateRandomRoomName = () => {
    const adjectives = [
      "Creative",
      "Innovative",
      "Dynamic",
      "Collaborative",
      "Interactive",
      "Productive",
      "Efficient",
      "Modern",
      "Digital",
      "Smart",
    ];
    const nouns = [
      "Workspace",
      "Studio",
      "Hub",
      "Lab",
      "Center",
      "Zone",
      "Space",
      "Room",
      "Area",
      "Place",
    ];
    const randomNum = Math.floor(Math.random() * 1000);
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adjective} ${noun} ${randomNum}`;
  };

  const handleGenerateName = () => {
    setRoomName(generateRandomRoomName());
    setError(null);
  };

  const validateRoomName = (name: string): string | null => {
    if (!name.trim()) {
      return "Room name is required";
    }

    if (name.length < 3) {
      return "Room name must be at least 3 characters long";
    }

    const maxLength = parseInt(
      process.env.NEXT_PUBLIC_MAX_ROOM_NAME_LENGTH || "50"
    );
    if (name.length > maxLength) {
      return `Room name must be less than ${maxLength} characters`;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateRoomName(roomName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roomName,
          created_by: userName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onRoomCreated(data.room_id); // Pass the actual room_id, not roomName
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to create room");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRoomName(value);

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card-standard p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
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
            </div>
            <h1 className="text-heading-1 mb-2">Create New Room</h1>
            <p className="text-body-small">
              Set up a new collaborative workspace
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-standard">
            <div>
              <label
                htmlFor="roomName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Room Name
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  id="roomName"
                  value={roomName}
                  onChange={handleInputChange}
                  className={`flex-1 input-standard ${error ? "error" : ""}`}
                  placeholder="Enter room name"
                  autoComplete="off"
                  autoFocus
                  disabled={isCreating}
                />
                <button
                  type="button"
                  onClick={handleGenerateName}
                  disabled={isCreating}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  title="Generate random room name"
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
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
                  {error}
                </p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onBack}
                disabled={isCreating}
                className="flex-1 btn-secondary py-3 px-4 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isCreating || !roomName.trim()}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  isCreating || !roomName.trim()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "btn-success"
                }`}
              >
                {isCreating ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  "Create Room"
                )}
              </button>
            </div>
          </form>

          {/* Help text */}
          <div className="mt-6 text-center">
            <p className="text-body-small">Room name requirements:</p>
            <ul className="text-caption mt-1 space-y-1">
              <li>• 3-50 characters long</li>
              <li>• Can contain letters, numbers, and spaces</li>
              <li>• Should be descriptive and memorable</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
