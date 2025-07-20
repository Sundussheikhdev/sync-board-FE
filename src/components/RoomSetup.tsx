"use client";

import React, { useState } from "react";
import { Users, Hash, User } from "lucide-react";

interface RoomSetupProps {
  onJoin: (roomName: string, userName: string) => void;
}

export default function RoomSetup({ onJoin }: RoomSetupProps) {
  // Generate a random room name like "Room-XYZ"
  const generateRoomName = () => {
    const randomId = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `Room-${randomId}`;
  };

  const [roomName, setRoomName] = useState(generateRoomName());
  const [userName, setUserName] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim() && userName.trim()) {
      setIsJoining(true);
      onJoin(roomName.trim(), userName.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Join Collaborative Room
          </h1>
          <p className="text-gray-600">
            Enter your name and room to start collaborating
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="userName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              <User className="w-4 h-4 inline mr-2" />
              Your Name
            </label>
            <input
              id="userName"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label
              htmlFor="roomName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              <Hash className="w-4 h-4 inline mr-2" />
              Room Name
            </label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!roomName.trim() || !userName.trim() || isJoining}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isJoining ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Joining...
              </div>
            ) : (
              "Join Room"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            💡 Tip: Share the room name with others to collaborate together
          </p>
        </div>
      </div>
    </div>
  );
}
