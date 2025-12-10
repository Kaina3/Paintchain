import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { FaPaintBrush, FaEraser, FaFillDrip, FaShapes, FaSlash, FaUndo, FaTrash } from 'react-icons/fa';
import { BiShapeCircle, BiShapeSquare, BiShapeTriangle } from 'react-icons/bi';
import { BsStarFill, BsHeartFill } from 'react-icons/bs';
import { TbOvalVertical, TbRectangle } from 'react-icons/tb';

export const COLORS = [
  '#000000', // Black
  '#FF0000', // Red
  '#FF69B4', // Pink
  '#0000FF', // Blue
  '#00BFFF', // Light Blue (水色)
  '#00AA00', // Green
  '#7CFC00', // Yellow Green (黄緑)
  '#FFCC00', // Yellow
  '#FF6600', // Orange
  '#9900FF', // Purple
  '#8B4513', // Brown
  '#FFFFFF', // White
];

export const MIN_BRUSH_SIZE = 1;
export const MAX_BRUSH_SIZE = 50;
export const DEFAULT_BRUSH_SIZE = 5;

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const STAMP_SHAPES = [
  { id: 'circle', name: '○', label: '丸', Icon: BiShapeCircle },
  { id: 'ellipse', name: '⬭', label: '楕円', Icon: TbOvalVertical },
  { id: 'square', name: '□', label: '正方形', Icon: BiShapeSquare },
  { id: 'rectangle', name: '▭', label: '長方形', Icon: TbRectangle },
  { id: 'triangle', name: '△', label: '三角形', Icon: BiShapeTriangle },
  { id: 'star', name: '☆', label: '星', Icon: BsStarFill },
  { id: 'heart', name: '♡', label: 'ハート', Icon: BsHeartFill },
];

export type StampShape = (typeof STAMP_SHAPES)[number]['id'];
export type ToolType = 'brush' | 'eraser' | 'bucket' | 'stamp' | 'line';

// Stamp preview state
interface StampPreview {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null;

export interface CanvasRef {
  getImageData: () => string;
  clear: () => void;
}

interface CanvasProps {
  showToolbar?: boolean;
  className?: string;
}

export const Canvas = forwardRef<CanvasRef, CanvasProps>(function Canvas(
  { showToolbar = true, className = '' },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null); // Off-screen canvas for drawing strokes
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [opacity, setOpacity] = useState(100);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const [tool, setTool] = useState<ToolType>('brush');
  const [stampShape, setStampShape] = useState<StampShape>('circle');
  const [fillStamp, setFillStamp] = useState(true);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [scale, setScale] = useState(1);

  // Stamp preview state
  const [stampPreview, setStampPreview] = useState<StampPreview | null>(null);
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Keyboard drawing state
  const [isWKeyPressed, setIsWKeyPressed] = useState(false);
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);

  // Line tool state
  const [linePoints, setLinePoints] = useState<{ x: number; y: number }[]>([]);
  const [linePreviewPoint, setLinePreviewPoint] = useState<{ x: number; y: number } | null>(null);

  const HANDLE_SIZE = 10;
  const DEFAULT_STAMP_SIZE = 60;

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getImageData: () => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      return canvas.toDataURL('image/png', 0.8);
    },
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      // Reset globalAlpha before clearing
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const state = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      setHistory([state]);
      setStampPreview(null);
      setLinePoints([]);
      setLinePreviewPoint(null);
    },
  }));

  // Scale canvas to fit container
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32;
        const newScale = Math.min(1, containerWidth / CANVAS_WIDTH);
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Initialize canvas with white background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const initialState = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    setHistory([initialState]);
  }, []);

  // Draw stamp preview on overlay canvas
  const drawStampPreview = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    const ctx = overlay?.getContext('2d');
    if (!ctx || !stampPreview) return;

    // Clear overlay
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const { x, y, width, height } = stampPreview;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = (opacity / 100) * 0.7; // Preview is slightly transparent

    ctx.beginPath();

    switch (stampShape) {
      case 'circle': {
        const radius = Math.min(width, height) / 2;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        break;
      }

      case 'ellipse':
        ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
        break;

      case 'square': {
        const size = Math.min(width, height);
        ctx.rect(centerX - size / 2, centerY - size / 2, size, size);
        break;
      }

      case 'rectangle':
        ctx.rect(x, y, width, height);
        break;

      case 'triangle': {
        ctx.moveTo(centerX, y);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x, y + height);
        ctx.closePath();
        break;
      }

      case 'star': {
        const spikes = 5;
        const outerRadius = Math.min(width, height) / 2;
        const innerRadius = outerRadius * 0.4;
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;

        ctx.moveTo(centerX, centerY - outerRadius);
        for (let i = 0; i < spikes; i++) {
          ctx.lineTo(centerX + Math.cos(rot) * outerRadius, centerY + Math.sin(rot) * outerRadius);
          rot += step;
          ctx.lineTo(centerX + Math.cos(rot) * innerRadius, centerY + Math.sin(rot) * innerRadius);
          rot += step;
        }
        ctx.closePath();
        break;
      }

      case 'heart': {
        const heartWidth = width / 2;
        const heartHeight = height / 2;
        const topCurveHeight = heartHeight * 0.3;
        ctx.moveTo(centerX, centerY + heartHeight * 0.3);
        ctx.bezierCurveTo(
          centerX, centerY - topCurveHeight,
          centerX - heartWidth, centerY - topCurveHeight,
          centerX - heartWidth, centerY + topCurveHeight
        );
        ctx.bezierCurveTo(
          centerX - heartWidth, centerY + heartHeight * 0.6,
          centerX, centerY + heartHeight * 0.8,
          centerX, centerY + heartHeight
        );
        ctx.bezierCurveTo(
          centerX, centerY + heartHeight * 0.8,
          centerX + heartWidth, centerY + heartHeight * 0.6,
          centerX + heartWidth, centerY + topCurveHeight
        );
        ctx.bezierCurveTo(
          centerX + heartWidth, centerY - topCurveHeight,
          centerX, centerY - topCurveHeight,
          centerX, centerY + heartHeight * 0.3
        );
        break;
      }
    }

    if (fillStamp) {
      ctx.fill();
    } else {
      ctx.stroke();
    }

    ctx.restore();

    // Draw bounding box and handles
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);

    // Draw corner handles
    ctx.fillStyle = '#3b82f6';
    const handles = [
      { hx: x, hy: y }, // nw
      { hx: x + width, hy: y }, // ne
      { hx: x, hy: y + height }, // sw
      { hx: x + width, hy: y + height }, // se
    ];

    handles.forEach(({ hx, hy }) => {
      ctx.fillRect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    });

    // Draw move indicator in center
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [stampPreview, stampShape, color, fillStamp, opacity, HANDLE_SIZE]);

  // Draw line preview on overlay canvas
  const drawLinePreview = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    const ctx = overlay?.getContext('2d');
    if (!ctx) return;

    // Clear overlay
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (linePoints.length === 0) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = opacity / 100;

    // Draw existing line segments
    if (linePoints.length > 1) {
      ctx.beginPath();
      ctx.moveTo(linePoints[0].x, linePoints[0].y);
      for (let i = 1; i < linePoints.length; i++) {
        ctx.lineTo(linePoints[i].x, linePoints[i].y);
      }
      ctx.stroke();
    }

    // Draw preview line to current mouse position
    if (linePreviewPoint) {
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(linePoints[linePoints.length - 1].x, linePoints[linePoints.length - 1].y);
      ctx.lineTo(linePreviewPoint.x, linePreviewPoint.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw points
    ctx.fillStyle = color;
    linePoints.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, brushSize / 2 + 2, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? '#3b82f6' : color;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.restore();
  }, [linePoints, linePreviewPoint, color, brushSize, opacity]);

  // Redraw preview when state changes
  useEffect(() => {
    if (tool === 'stamp' && stampPreview) {
      drawStampPreview();
    } else if (tool === 'line' && linePoints.length > 0) {
      drawLinePreview();
    } else {
      const overlay = overlayCanvasRef.current;
      const ctx = overlay?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }
  }, [tool, stampPreview, drawStampPreview, linePoints, linePreviewPoint, drawLinePreview]);

  // Commit stamp to main canvas
  const commitStamp = useCallback(() => {
    if (!stampPreview) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y, width, height } = stampPreview;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();

    switch (stampShape) {
      case 'circle': {
        const radius = Math.min(width, height) / 2;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        break;
      }

      case 'ellipse':
        ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
        break;

      case 'square': {
        const size = Math.min(width, height);
        ctx.rect(centerX - size / 2, centerY - size / 2, size, size);
        break;
      }

      case 'rectangle':
        ctx.rect(x, y, width, height);
        break;

      case 'triangle': {
        ctx.moveTo(centerX, y);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x, y + height);
        ctx.closePath();
        break;
      }

      case 'star': {
        const spikes = 5;
        const outerRadius = Math.min(width, height) / 2;
        const innerRadius = outerRadius * 0.4;
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;

        ctx.moveTo(centerX, centerY - outerRadius);
        for (let i = 0; i < spikes; i++) {
          ctx.lineTo(centerX + Math.cos(rot) * outerRadius, centerY + Math.sin(rot) * outerRadius);
          rot += step;
          ctx.lineTo(centerX + Math.cos(rot) * innerRadius, centerY + Math.sin(rot) * innerRadius);
          rot += step;
        }
        ctx.closePath();
        break;
      }

      case 'heart': {
        const heartWidth = width / 2;
        const heartHeight = height / 2;
        const topCurveHeight = heartHeight * 0.3;
        ctx.moveTo(centerX, centerY + heartHeight * 0.3);
        ctx.bezierCurveTo(
          centerX, centerY - topCurveHeight,
          centerX - heartWidth, centerY - topCurveHeight,
          centerX - heartWidth, centerY + topCurveHeight
        );
        ctx.bezierCurveTo(
          centerX - heartWidth, centerY + heartHeight * 0.6,
          centerX, centerY + heartHeight * 0.8,
          centerX, centerY + heartHeight
        );
        ctx.bezierCurveTo(
          centerX, centerY + heartHeight * 0.8,
          centerX + heartWidth, centerY + heartHeight * 0.6,
          centerX + heartWidth, centerY + topCurveHeight
        );
        ctx.bezierCurveTo(
          centerX + heartWidth, centerY - topCurveHeight,
          centerX, centerY - topCurveHeight,
          centerX, centerY + heartHeight * 0.3
        );
        break;
      }
    }

    if (fillStamp) {
      ctx.fill();
    } else {
      ctx.stroke();
    }

    ctx.restore();

    // Save to history
    const newState = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    setHistory((prev) => [...prev.slice(-19), newState]);

    setStampPreview(null);
  }, [stampPreview, stampShape, color, fillStamp, opacity]);

  // Commit line to main canvas
  const commitLine = useCallback(() => {
    if (linePoints.length < 2) {
      setLinePoints([]);
      setLinePreviewPoint(null);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = opacity / 100;

    ctx.beginPath();
    ctx.moveTo(linePoints[0].x, linePoints[0].y);
    for (let i = 1; i < linePoints.length; i++) {
      ctx.lineTo(linePoints[i].x, linePoints[i].y);
    }
    ctx.stroke();

    ctx.restore();

    // Save to history
    const newState = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    setHistory((prev) => [...prev.slice(-19), newState]);

    // Clear line points
    setLinePoints([]);
    setLinePreviewPoint(null);
  }, [linePoints, color, brushSize, opacity]);

  const getCoordinates = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ('touches' in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale]
  );

  // Check which handle is being clicked
  const getClickedHandle = useCallback(
    (x: number, y: number): DragHandle => {
      if (!stampPreview) return null;

      const { x: sx, y: sy, width, height } = stampPreview;
      const centerX = sx + width / 2;
      const centerY = sy + height / 2;

      // Check corner handles
      const handlePositions = [
        { handle: 'nw' as const, hx: sx, hy: sy },
        { handle: 'ne' as const, hx: sx + width, hy: sy },
        { handle: 'sw' as const, hx: sx, hy: sy + height },
        { handle: 'se' as const, hx: sx + width, hy: sy + height },
      ];

      for (const { handle, hx, hy } of handlePositions) {
        if (
          Math.abs(x - hx) <= HANDLE_SIZE &&
          Math.abs(y - hy) <= HANDLE_SIZE
        ) {
          return handle;
        }
      }

      // Check if inside the shape (for moving)
      if (
        x >= sx &&
        x <= sx + width &&
        y >= sy &&
        y <= sy + height
      ) {
        // Prioritize center move handle
        if (Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2) <= 15) {
          return 'move';
        }
        return 'move';
      }

      return null;
    },
    [stampPreview, HANDLE_SIZE]
  );

  // Flood fill (bucket tool) algorithm
  const floodFill = useCallback(
    (startX: number, startY: number, fillColor: string) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const data = imageData.data;

      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
          : { r: 0, g: 0, b: 0 };
      };

      const fillRgb = hexToRgb(fillColor);
      const x = Math.floor(startX);
      const y = Math.floor(startY);

      const getPixelIndex = (px: number, py: number) => (py * CANVAS_WIDTH + px) * 4;
      const startIndex = getPixelIndex(x, y);
      const startR = data[startIndex];
      const startG = data[startIndex + 1];
      const startB = data[startIndex + 2];

      if (startR === fillRgb.r && startG === fillRgb.g && startB === fillRgb.b) {
        return;
      }

      const tolerance = 32;
      const matchesStart = (index: number) => {
        return (
          Math.abs(data[index] - startR) <= tolerance &&
          Math.abs(data[index + 1] - startG) <= tolerance &&
          Math.abs(data[index + 2] - startB) <= tolerance
        );
      };

      const stack: [number, number][] = [[x, y]];
      const visited = new Set<string>();

      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        const key = `${cx},${cy}`;

        if (visited.has(key)) continue;
        if (cx < 0 || cx >= CANVAS_WIDTH || cy < 0 || cy >= CANVAS_HEIGHT) continue;

        const idx = getPixelIndex(cx, cy);
        if (!matchesStart(idx)) continue;

        visited.add(key);

        data[idx] = fillRgb.r;
        data[idx + 1] = fillRgb.g;
        data[idx + 2] = fillRgb.b;
        data[idx + 3] = 255;

        stack.push([cx + 1, cy]);
        stack.push([cx - 1, cy]);
        stack.push([cx, cy + 1]);
        stack.push([cx, cy - 1]);
      }

      ctx.putImageData(imageData, 0, 0);

      const newState = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      setHistory((prev) => [...prev.slice(-19), newState]);
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const coords = getCoordinates(e);
      if (!coords) return;

      // Handle stamp tool
      if (tool === 'stamp') {
        const handle = getClickedHandle(coords.x, coords.y);
        
        if (handle) {
          // Start dragging existing stamp
          setDragHandle(handle);
          setDragStart(coords);
        } else if (stampPreview) {
          // Clicked outside - commit current stamp and create new one
          commitStamp();
          setStampPreview({
            x: coords.x - DEFAULT_STAMP_SIZE / 2,
            y: coords.y - DEFAULT_STAMP_SIZE / 2,
            width: DEFAULT_STAMP_SIZE,
            height: DEFAULT_STAMP_SIZE,
          });
        } else {
          // Create new stamp preview
          setStampPreview({
            x: coords.x - DEFAULT_STAMP_SIZE / 2,
            y: coords.y - DEFAULT_STAMP_SIZE / 2,
            width: DEFAULT_STAMP_SIZE,
            height: DEFAULT_STAMP_SIZE,
          });
        }
        return;
      }

      // Handle bucket tool
      if (tool === 'bucket') {
        floodFill(coords.x, coords.y, color);
        return;
      }

      // Handle line tool
      if (tool === 'line') {
        setLinePoints((prev) => [...prev, coords]);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      // Create off-screen canvas for this stroke
      const drawingCanvas = document.createElement('canvas');
      drawingCanvas.width = CANVAS_WIDTH;
      drawingCanvas.height = CANVAS_HEIGHT;
      drawingCanvasRef.current = drawingCanvas;

      const drawCtx = drawingCanvas.getContext('2d');
      if (!drawCtx) return;

      setIsDrawing(true);
      
      // Set up drawing context on off-screen canvas
      drawCtx.lineCap = 'round';
      drawCtx.lineJoin = 'round';
      drawCtx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
      drawCtx.lineWidth = brushSize;
      drawCtx.beginPath();
      drawCtx.moveTo(coords.x, coords.y);
    },
    [getCoordinates, color, brushSize, tool, opacity, floodFill, stampPreview, commitStamp, getClickedHandle, DEFAULT_STAMP_SIZE]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const coords = getCoordinates(e);
      if (!coords) return;

      // Always track mouse position for W key drawing
      mousePositionRef.current = coords;

      // Update line preview point
      if (tool === 'line' && linePoints.length > 0) {
        setLinePreviewPoint(coords);
        return;
      }

      // Start drawing if W key is pressed and not already drawing
      if (isWKeyPressed && !isDrawing && tool !== 'stamp' && tool !== 'bucket' && tool !== 'line') {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        // Create off-screen canvas for this stroke
        const drawingCanvas = document.createElement('canvas');
        drawingCanvas.width = CANVAS_WIDTH;
        drawingCanvas.height = CANVAS_HEIGHT;
        drawingCanvasRef.current = drawingCanvas;

        const drawCtx = drawingCanvas.getContext('2d');
        if (!drawCtx) return;

        setIsDrawing(true);

        // Set up drawing context on off-screen canvas
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
        drawCtx.lineWidth = brushSize;
        drawCtx.beginPath();
        drawCtx.moveTo(coords.x, coords.y);
        return;
      }

      // Handle stamp dragging
      if (tool === 'stamp' && dragHandle && dragStart && stampPreview) {
        const dx = coords.x - dragStart.x;
        const dy = coords.y - dragStart.y;

        setStampPreview((prev) => {
          if (!prev) return null;

          switch (dragHandle) {
            case 'move':
              return {
                ...prev,
                x: prev.x + dx,
                y: prev.y + dy,
              };
            case 'nw':
              return {
                x: prev.x + dx,
                y: prev.y + dy,
                width: Math.max(20, prev.width - dx),
                height: Math.max(20, prev.height - dy),
              };
            case 'ne':
              return {
                ...prev,
                y: prev.y + dy,
                width: Math.max(20, prev.width + dx),
                height: Math.max(20, prev.height - dy),
              };
            case 'sw':
              return {
                x: prev.x + dx,
                y: prev.y,
                width: Math.max(20, prev.width - dx),
                height: Math.max(20, prev.height + dy),
              };
            case 'se':
              return {
                ...prev,
                width: Math.max(20, prev.width + dx),
                height: Math.max(20, prev.height + dy),
              };
            default:
              return prev;
          }
        });

        setDragStart(coords);
        return;
      }

      if (!isDrawing) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const drawingCanvas = drawingCanvasRef.current;
      const drawCtx = drawingCanvas?.getContext('2d');
      if (!ctx || !drawCtx || !drawingCanvas) return;

      // Draw on off-screen canvas
      drawCtx.lineTo(coords.x, coords.y);
      drawCtx.stroke();
      drawCtx.beginPath();
      drawCtx.moveTo(coords.x, coords.y);

      // Restore main canvas from history and composite the drawing
      if (history.length > 0) {
        ctx.putImageData(history[history.length - 1], 0, 0);
      }
      ctx.globalAlpha = tool === 'eraser' ? 1 : opacity / 100;
      ctx.drawImage(drawingCanvas, 0, 0);
      ctx.globalAlpha = 1;
    },
    [isDrawing, isWKeyPressed, getCoordinates, tool, color, brushSize, dragHandle, dragStart, stampPreview, history, opacity]
  );

  const stopDrawing = useCallback(() => {
    // Stop stamp dragging
    if (dragHandle) {
      setDragHandle(null);
      setDragStart(null);
      return;
    }

    if (!isDrawing) return;

    setIsDrawing(false);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const drawingCanvas = drawingCanvasRef.current;
    if (!ctx || !drawingCanvas) return;

    // Final composite: restore from history and apply stroke with opacity
    if (history.length > 0) {
      ctx.putImageData(history[history.length - 1], 0, 0);
    }
    ctx.globalAlpha = tool === 'eraser' ? 1 : opacity / 100;
    ctx.drawImage(drawingCanvas, 0, 0);
    ctx.globalAlpha = 1;

    // Save to history
    const newState = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    setHistory((prev) => [...prev.slice(-19), newState]);

    // Clear drawing canvas reference
    drawingCanvasRef.current = null;
  }, [isDrawing, dragHandle, history, tool, opacity]);

  const handleUndo = useCallback(() => {
    if (history.length <= 1) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const newHistory = history.slice(0, -1);
    const previousState = newHistory[newHistory.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory(newHistory);
  }, [history]);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    // Reset globalAlpha before clearing
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const newState = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    setHistory((prev) => [...prev, newState]);
    setStampPreview(null);
    setLinePoints([]);
    setLinePreviewPoint(null);
  }, []);

  // Cancel stamp preview when switching tools
  useEffect(() => {
    if (tool !== 'stamp') {
      setStampPreview(null);
      setDragHandle(null);
      setDragStart(null);
    }
  }, [tool]);

  // Commit and clear line when switching away from line tool
  useEffect(() => {
    if (tool !== 'line' && linePoints.length > 0) {
      commitLine();
    }
  }, [tool, linePoints.length, commitLine]);

  // Keyboard drawing with W key
  const startDrawingAtPosition = useCallback(
    (x: number, y: number) => {
      if (tool === 'stamp' || tool === 'bucket' || tool === 'line') return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      // Create off-screen canvas for this stroke
      const drawingCanvas = document.createElement('canvas');
      drawingCanvas.width = CANVAS_WIDTH;
      drawingCanvas.height = CANVAS_HEIGHT;
      drawingCanvasRef.current = drawingCanvas;

      const drawCtx = drawingCanvas.getContext('2d');
      if (!drawCtx) return;

      setIsDrawing(true);

      // Set up drawing context on off-screen canvas
      drawCtx.lineCap = 'round';
      drawCtx.lineJoin = 'round';
      drawCtx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
      drawCtx.lineWidth = brushSize;
      drawCtx.beginPath();
      drawCtx.moveTo(x, y);
    },
    [tool, color, brushSize]
  );

  // Handle keyboard events for W key drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'w' && !e.repeat && !isWKeyPressed) {
        // Prevent if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        setIsWKeyPressed(true);
        
        // Start drawing at current mouse position if available
        if (mousePositionRef.current && !isDrawing) {
          startDrawingAtPosition(mousePositionRef.current.x, mousePositionRef.current.y);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'w') {
        setIsWKeyPressed(false);
        
        // Stop drawing
        if (isDrawing) {
          stopDrawing();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isWKeyPressed, isDrawing, startDrawingAtPosition, stopDrawing]);

  // Get cursor style based on context
  const getCursorStyle = useCallback(() => {
    if (tool === 'stamp' && stampPreview) {
      return 'default';
    }
    return 'crosshair';
  }, [tool, stampPreview]);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-white p-4 shadow-lg"
      >
        {/* Main canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            width: CANVAS_WIDTH * scale,
            height: CANVAS_HEIGHT * scale,
            touchAction: 'none',
          }}
          className="rounded border border-gray-300"
        />
        {/* Overlay canvas for stamp preview */}
        <canvas
          ref={overlayCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            width: CANVAS_WIDTH * scale,
            height: CANVAS_HEIGHT * scale,
            touchAction: 'none',
            position: 'absolute',
            pointerEvents: 'auto',
            cursor: getCursorStyle(),
          }}
          className="rounded"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Toolbar */}
      {showToolbar && (
        <div className="mt-4 space-y-3 rounded-xl bg-white p-4 shadow-lg">
          {/* Colors */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600">色:</span>
            {COLORS.filter((c) => c !== '#FFFFFF').map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  if (tool === 'eraser') setTool('brush');
                }}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  color === c && tool !== 'eraser' ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-300'
                }`}
                style={{ backgroundColor: c, opacity: opacity / 100 }}
              />
            ))}
          </div>

          {/* Opacity Slider */}
          {tool !== 'eraser' && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-600">透明度:</span>
              <div className="flex flex-1 items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="h-2 w-32 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary-600 sm:w-48"
                />
                <span className="min-w-[3rem] text-sm font-medium text-gray-700">{opacity}%</span>
                {/* Preview with opacity */}
                <div
                  className="h-6 w-6 rounded-full"
                  style={{
                    backgroundColor: color,
                    opacity: opacity / 100,
                    border: '1px solid #9ca3af',
                  }}
                />
              </div>
            </div>
          )}

          {/* Brush Size Slider - only show for brush/eraser/line */}
          {(tool === 'brush' || tool === 'eraser' || tool === 'line') && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-600">太さ:</span>
              <div className="flex flex-1 items-center gap-3">
                <input
                  type="range"
                  min={MIN_BRUSH_SIZE}
                  max={MAX_BRUSH_SIZE}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="h-2 w-32 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary-600 sm:w-48"
                />
                <span className="min-w-[3rem] text-sm font-medium text-gray-700">{brushSize}px</span>
                {/* Preview circle */}
                <div
                  className="rounded-full"
                  style={{
                    width: Math.min(brushSize, 30),
                    height: Math.min(brushSize, 30),
                    backgroundColor: tool === 'eraser' ? '#e5e7eb' : color,
                    border: '1px solid #9ca3af',
                  }}
                />
              </div>
            </div>
          )}

          {/* Tools */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTool('brush')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                tool === 'brush'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaPaintBrush className="h-4 w-4" /> ブラシ
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                tool === 'eraser'
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaEraser className="h-4 w-4" /> 消しゴム
            </button>
            <button
              onClick={() => setTool('bucket')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                tool === 'bucket'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaFillDrip className="h-4 w-4" /> バケツ
            </button>
            <button
              onClick={() => setTool('stamp')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                tool === 'stamp'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaShapes className="h-4 w-4" /> スタンプ
            </button>
            <button
              onClick={() => setTool('line')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                tool === 'line'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaSlash className="h-4 w-4" /> 直線
            </button>
            <button
              onClick={handleUndo}
              disabled={history.length <= 1}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              <FaUndo className="h-4 w-4" /> 元に戻す
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 hover:bg-red-200"
            >
              <FaTrash className="h-4 w-4" /> クリア
            </button>
          </div>

          {/* Stamp Options */}
          {tool === 'stamp' && (
            <div className="space-y-3 rounded-lg bg-purple-50 p-3">
              {/* Instructions */}
              <p className="text-xs text-purple-700">
                💡 キャンバスをクリックして図形を配置 → 角をドラッグでサイズ変更 → 中央をドラッグで移動 → 別の場所をクリックで確定
              </p>
              
              {/* Stamp Shape Selection */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">形:</span>
                {STAMP_SHAPES.map((shape) => {
                  const Icon = shape.Icon;
                  return (
                    <button
                      key={shape.id}
                      onClick={() => setStampShape(shape.id)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                        stampShape === shape.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-purple-100'
                      }`}
                      title={shape.label}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>

              {/* Fill Toggle */}
              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={fillStamp}
                    onChange={(e) => setFillStamp(e.target.checked)}
                    className="h-4 w-4 rounded accent-purple-600"
                  />
                  <span className="text-sm text-gray-600">塗りつぶし</span>
                </label>
                
                {/* Confirm button when preview exists */}
                {stampPreview && (
                  <button
                    onClick={commitStamp}
                    className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
                  >
                    ✓ 確定
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Line Options */}
          {tool === 'line' && (
            <div className="space-y-3 rounded-lg bg-green-50 p-3">
              {/* Instructions */}
              <p className="text-xs text-green-700">
                💡 クリックで点を追加 → 連続してクリックで直線を繋げる → 他のツールに切り替えるか確定ボタンで描画
              </p>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  点の数: <span className="font-medium">{linePoints.length}</span>
                </span>
                
                {linePoints.length >= 2 && (
                  <button
                    onClick={commitLine}
                    className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                  >
                    ✓ 確定
                  </button>
                )}
                
                {linePoints.length > 0 && (
                  <button
                    onClick={() => {
                      setLinePoints([]);
                      setLinePreviewPoint(null);
                    }}
                    className="rounded-lg bg-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
                  >
                    ✕ キャンセル
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
