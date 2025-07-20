"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Upload, FileText, Image, Download } from "lucide-react";
import { ChatMessage } from "@/utils/websocket";
import FilePreviewModal from "./FilePreviewModal";

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onFileUpload: (file: File) => void;
  isConnected: boolean;
  onlineUsers: string[];
  currentUserName: string;
}

export default function Chat({
  messages,
  onSendMessage,
  onFileUpload,
  isConnected,
  onlineUsers,
  currentUserName,
}: ChatProps) {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
    type?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && isConnected) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && isConnected) {
      setIsUploading(true);
      try {
        await onFileUpload(file);
      } catch (error) {
        console.error("File upload failed:", error);
      } finally {
        setIsUploading(false);
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <FileText size={16} />;

    if (fileType.startsWith("image/")) {
      return <Image size={16} />;
    }
    return <FileText size={16} />;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleFilePreview = (
    fileUrl: string,
    fileName: string,
    fileType?: string
  ) => {
    setPreviewFile({
      url: fileUrl,
      name: fileName,
      type: fileType,
    });
  };

  const closeFilePreview = () => {
    setPreviewFile(null);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-heading-3">Chat</h3>
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-body-small">{onlineUsers.length} online</span>
          </div>
        </div>
      </div>

      {/* Online Users */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Online Users</h4>
        <div className="flex flex-wrap gap-2">
          {onlineUsers.length === 0 ? (
            <span className="text-body-small">No users online</span>
          ) : (
            onlineUsers.map((user, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                {user}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-body">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwnMessage = msg.userName === currentUserName;
            return (
              <div
                key={index}
                className={`flex flex-col space-y-1 ${
                  isOwnMessage ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`flex items-center space-x-2 ${
                    isOwnMessage ? "flex-row-reverse" : ""
                  }`}
                >
                  <span className="text-sm font-medium text-blue-600">
                    {msg.userName || `User ${msg.userId}`}
                  </span>
                  <span className="text-caption">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                {msg.fileUrl ? (
                  <div
                    className={`rounded-lg p-3 border max-w-xs ${
                      isOwnMessage
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      {getFileIcon(msg.fileType)}
                      <span
                        className={`text-sm font-medium ${
                          isOwnMessage ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {msg.fileName}
                      </span>
                    </div>

                    {msg.fileType?.startsWith("image/") ? (
                      <div className="space-y-2">
                        <img
                          src={msg.fileUrl}
                          alt={msg.fileName}
                          className="max-w-full h-32 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() =>
                            handleFilePreview(
                              msg.fileUrl || "",
                              msg.fileName || "Image",
                              msg.fileType
                            )
                          }
                        />
                        <div className="flex items-center justify-between text-xs opacity-75">
                          <span>Click to preview</span>
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center space-x-1 ${
                              isOwnMessage
                                ? "text-white hover:text-blue-100"
                                : "text-blue-600 hover:text-blue-800"
                            }`}
                          >
                            <Download size={14} />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ) : msg.fileType === "application/pdf" ? (
                      <div className="space-y-2">
                        <div
                          className="bg-red-50 border border-red-200 rounded p-3 flex items-center space-x-3 cursor-pointer hover:bg-red-100 transition-colors"
                          onClick={() =>
                            handleFilePreview(
                              msg.fileUrl || "",
                              msg.fileName || "PDF",
                              msg.fileType
                            )
                          }
                        >
                          <div className="text-red-500">
                            <svg
                              className="w-8 h-8"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-800">
                              PDF Document
                            </p>
                            <p className="text-xs text-red-600">
                              {msg.fileName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs opacity-75">
                          <span>Click to preview</span>
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center space-x-1 ${
                              isOwnMessage
                                ? "text-white hover:text-blue-100"
                                : "text-blue-600 hover:text-blue-800"
                            }`}
                          >
                            <Download size={14} />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <FileText
                          size={20}
                          className={
                            isOwnMessage ? "text-white" : "text-gray-500"
                          }
                        />
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm flex items-center space-x-1 ${
                            isOwnMessage
                              ? "text-white hover:text-blue-100"
                              : "text-blue-600 hover:text-blue-800"
                          }`}
                        >
                          <Download size={16} />
                          <span>Download</span>
                        </a>
                      </div>
                    )}

                    {msg.message && (
                      <p
                        className={`text-sm mt-2 ${
                          isOwnMessage ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {msg.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    className={`rounded-lg p-3 max-w-xs ${
                      isOwnMessage
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            disabled={!isConnected}
            className="flex-1 input-standard"
          />

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,application/pdf"
            className="hidden"
            disabled={!isConnected || isUploading}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isConnected || isUploading}
            className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed relative group"
            title="Upload image or PDF files"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            ) : (
              <Upload size={20} />
            )}
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Upload image or PDF
            </div>
          </button>

          <button
            type="submit"
            disabled={!isConnected || !message.trim()}
            className="px-4 py-2 btn-primary disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </form>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={closeFilePreview}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={previewFile.type}
        />
      )}
    </div>
  );
}
