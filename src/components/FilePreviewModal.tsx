"use client";

import React, { useState, useEffect } from "react";
import { X, Download, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType?: string;
}

export default function FilePreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
}: FilePreviewModalProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setIsLoading(true);
      setError(null);
    }
  }, [isOpen, fileUrl]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.25));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError("Failed to load image");
  };

  const isImage =
    fileType?.startsWith("image/") ||
    fileName
      .toLowerCase()
      .match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|tiff|tif)$/);

  const isPDF =
    fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] bg-white rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900 truncate max-w-md">
              {fileName}
            </h2>
            <span className="text-sm text-gray-500">
              {isImage ? "Image" : isPDF ? "PDF" : "File"}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            {isImage && (
              <>
                <button
                  onClick={handleZoomOut}
                  disabled={scale <= 0.25}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom Out"
                >
                  <ZoomOut size={20} />
                </button>
                <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={scale >= 3}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom In"
                >
                  <ZoomIn size={20} />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  title="Rotate"
                >
                  <RotateCw size={20} />
                </button>
              </>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Download"
            >
              <Download size={20} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-600 text-lg mb-2">{error}</p>
                <p className="text-gray-500">Unable to preview this file</p>
              </div>
            </div>
          )}

          {/* Image Preview */}
          {isImage && !error && (
            <div className="flex items-center justify-center h-full overflow-auto">
              <img
                src={fileUrl}
                alt={fileName}
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease-in-out",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
                className="shadow-lg"
              />
            </div>
          )}

          {/* PDF Preview */}
          {isPDF && !error && (
            <div className="h-full">
              <iframe
                src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                title={fileName}
                className="w-full h-full border-0"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setError("Failed to load PDF");
                }}
              />
            </div>
          )}

          {/* Fallback for other file types */}
          {!isImage && !isPDF && !error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-600 text-lg mb-2">
                  File Preview Not Available
                </p>
                <p className="text-gray-500 mb-4">
                  This file type cannot be previewed
                </p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Download File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
