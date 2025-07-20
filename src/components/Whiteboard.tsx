"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { HexColorPicker } from "react-colorful";
import { Eraser, Palette, Trash2 } from "lucide-react";
import { DrawData, DrawStroke, DrawPoint } from "@/utils/websocket";

interface WhiteboardProps {
  onDraw: (data: DrawData) => void;
  onStrokeStart: (stroke: DrawStroke) => void;
  onStrokePoint: (strokeId: string, point: DrawPoint) => void;
  onStrokeEnd: (strokeId: string) => void;
  onRemoteDraw: (callback: (data: DrawData) => void) => void;
  onRemoteStrokeStart: (callback: (stroke: DrawStroke) => void) => void;
  onRemoteStrokePoint: (
    callback: (strokeId: string, point: DrawPoint) => void
  ) => void;
  onRemoteStrokeEnd: (callback: (strokeId: string) => void) => void;
  onClearCanvas: () => void;
  onCanvasState: (callback: (drawings: DrawData[]) => void) => void;
  onClearCanvasRemote: (callback: () => void) => void;
  isConnected: boolean;
  currentUserId: string;
  currentUserName: string;
}

export default function Whiteboard({
  onDraw,
  onStrokeStart,
  onStrokePoint,
  onStrokeEnd,
  onRemoteDraw,
  onRemoteStrokeStart,
  onRemoteStrokePoint,
  onRemoteStrokeEnd,
  onClearCanvas,
  onCanvasState,
  onClearCanvasRemote,
  isConnected,
  currentUserId,
  currentUserName,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(2);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [currentStrokeId, setCurrentStrokeId] = useState<string | null>(null);
  const [activeStrokes, setActiveStrokes] = useState<Map<string, DrawStroke>>(
    new Map()
  );

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const getCanvasCoordinates = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const generateStrokeId = useCallback(() => {
    return `${currentUserId}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }, [currentUserId]);

  const drawStroke = useCallback(
    (stroke: DrawStroke) => {
      const ctx = getContext();
      if (!ctx || stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const firstPoint = stroke.points[0];
      ctx.moveTo(firstPoint.x, firstPoint.y);

      for (let i = 1; i < stroke.points.length; i++) {
        const point = stroke.points[i];
        ctx.lineTo(point.x, point.y);
      }

      ctx.stroke();
    },
    [getContext]
  );

  const drawPoint = useCallback(
    (strokeId: string, point: DrawPoint) => {
      const stroke = activeStrokes.get(strokeId);
      if (!stroke) return;

      // Add point to stroke
      stroke.points.push(point);
      setActiveStrokes(new Map(activeStrokes));

      // Redraw the stroke
      const ctx = getContext();
      if (!ctx) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.points.length >= 2) {
        ctx.moveTo(
          stroke.points[stroke.points.length - 2].x,
          stroke.points[stroke.points.length - 2].y
        );
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
    },
    [activeStrokes, getContext]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isConnected) return;

      setIsDrawing(true);
      const coords = getCanvasCoordinates(event);

      // Create new stroke
      const strokeId = generateStrokeId();
      const stroke: DrawStroke = {
        id: strokeId,
        userId: currentUserId,
        userName: currentUserName,
        points: [coords],
        color: isEraser ? "#ffffff" : color,
        brushSize,
        timestamp: new Date().toISOString(),
      };

      setCurrentStrokeId(strokeId);
      setActiveStrokes((prev) => new Map(prev.set(strokeId, stroke)));

      // Send stroke start
      onStrokeStart(stroke);

      // Draw initial point
      const ctx = getContext();
      if (ctx) {
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.brushSize;
        ctx.lineCap = "round";
        ctx.moveTo(coords.x, coords.y);
      }
    },
    [
      isConnected,
      getCanvasCoordinates,
      generateStrokeId,
      currentUserId,
      currentUserName,
      isEraser,
      color,
      brushSize,
      onStrokeStart,
      getContext,
    ]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !currentStrokeId || !isConnected) return;

      const coords = getCanvasCoordinates(event);

      // Send stroke point
      onStrokePoint(currentStrokeId, coords);

      // Draw locally
      const ctx = getContext();
      if (ctx) {
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
      }
    },
    [
      isDrawing,
      currentStrokeId,
      isConnected,
      getCanvasCoordinates,
      onStrokePoint,
      getContext,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentStrokeId && isConnected) {
      // Send stroke end
      onStrokeEnd(currentStrokeId);

      // Remove from active strokes
      setActiveStrokes((prev) => {
        const newMap = new Map(prev);
        newMap.delete(currentStrokeId);
        return newMap;
      });
    }

    setIsDrawing(false);
    setCurrentStrokeId(null);
  }, [isDrawing, currentStrokeId, isConnected, onStrokeEnd]);

  const handleRemoteDraw = useCallback(
    (data: DrawData) => {
      const ctx = getContext();
      if (!ctx) return;

      if (data.isDrawing) {
        ctx.lineWidth = data.brushSize;
        ctx.lineCap = "round";
        ctx.strokeStyle = data.color;
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
      } else {
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
      }
    },
    [getContext]
  );

  const handleRemoteStrokeStart = useCallback(
    (stroke: DrawStroke) => {
      // Add to active strokes
      setActiveStrokes((prev) => new Map(prev.set(stroke.id, stroke)));

      // Draw the stroke
      drawStroke(stroke);
    },
    [drawStroke]
  );

  const handleRemoteStrokePoint = useCallback(
    (strokeId: string, point: DrawPoint) => {
      // Add point to existing stroke
      setActiveStrokes((prev) => {
        const stroke = prev.get(strokeId);
        if (stroke) {
          stroke.points.push(point);
          return new Map(prev);
        }
        return prev;
      });

      // Draw the point
      drawPoint(strokeId, point);
    },
    [drawPoint]
  );

  const handleRemoteStrokeEnd = useCallback((strokeId: string) => {
    // Remove from active strokes
    setActiveStrokes((prev) => {
      const newMap = new Map(prev);
      newMap.delete(strokeId);
      return newMap;
    });
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Notify others about canvas clear
    if (isConnected) {
      onClearCanvas();
    }
  }, [getContext, isConnected, onClearCanvas]);

  const handleCanvasState = useCallback(
    (drawings: any[]) => {
      const ctx = getContext();
      if (!ctx) return;

      // Clear canvas first
      const canvas = canvasRef.current;
      if (canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Redraw all existing strokes
      drawings.forEach((stroke) => {
        if (stroke.points && stroke.points.length >= 2) {
          ctx.beginPath();
          ctx.strokeStyle = stroke.color || "#000000";
          ctx.lineWidth = stroke.brushSize || 2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          // Start at the first point
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

          // Draw lines to all subsequent points
          for (let i = 1; i < stroke.points.length; i++) {
            const point = stroke.points[i];
            ctx.lineTo(point.x, point.y);
          }

          ctx.stroke();
        }
      });
    },
    [getContext]
  );

  const handleClearCanvasRemote = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [getContext]);

  const toggleEraser = useCallback(() => {
    setIsEraser(!isEraser);
  }, [isEraser]);

  // Set up canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Set initial canvas style
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Handle remote draw events
  useEffect(() => {
    onRemoteDraw(handleRemoteDraw);
  }, [onRemoteDraw, handleRemoteDraw]);

  // Handle remote stroke events
  useEffect(() => {
    onRemoteStrokeStart(handleRemoteStrokeStart);
  }, [onRemoteStrokeStart, handleRemoteStrokeStart]);

  useEffect(() => {
    onRemoteStrokePoint(handleRemoteStrokePoint);
  }, [onRemoteStrokePoint, handleRemoteStrokePoint]);

  useEffect(() => {
    onRemoteStrokeEnd(handleRemoteStrokeEnd);
  }, [onRemoteStrokeEnd, handleRemoteStrokeEnd]);

  // Handle canvas state
  useEffect(() => {
    onCanvasState(handleCanvasState);
  }, [onCanvasState, handleCanvasState]);

  // Handle remote clear canvas
  useEffect(() => {
    onClearCanvasRemote(handleClearCanvasRemote);
  }, [onClearCanvasRemote, handleClearCanvasRemote]);

  // Cleanup active strokes when connection changes
  useEffect(() => {
    if (!isConnected) {
      setActiveStrokes(new Map());
      setCurrentStrokeId(null);
      setIsDrawing(false);
    }
  }, [isConnected]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <Palette size={20} />
              <div
                className="w-6 h-6 rounded border border-gray-300"
                style={{ backgroundColor: color }}
              />
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-2 z-10">
                <HexColorPicker color={color} onChange={setColor} />
              </div>
            )}
          </div>

          {/* Brush Size */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-sm text-gray-600 w-8">{brushSize}</span>
          </div>

          {/* Eraser Toggle */}
          <button
            onClick={toggleEraser}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
              isEraser
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            <Eraser size={20} />
            <span className="text-sm">Eraser</span>
          </button>
        </div>

        {/* Clear Button */}
        <button
          onClick={clearCanvas}
          className="flex items-center space-x-2 px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
        >
          <Trash2 size={20} />
          <span className="text-sm">Clear</span>
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 p-4">
        <div className="relative w-full h-full border border-gray-300 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-crosshair w-full h-full"
            style={{ touchAction: "none" }}
          />

          {/* Connection Status */}
          <div className="absolute top-2 right-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
