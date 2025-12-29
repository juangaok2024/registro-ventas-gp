'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageViewerProps {
  src: string;
  alt?: string;
  onClose: () => void;
  isOpen: boolean;
}

export function ImageViewer({ src, alt = 'Imagen', onClose, isOpen }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          setZoom(z => Math.min(z + 0.25, 4));
          break;
        case '-':
          setZoom(z => Math.max(z - 0.25, 0.5));
          break;
        case 'r':
          setRotation(r => (r + 90) % 360);
          break;
        case '0':
          setZoom(1);
          setRotation(0);
          setPosition({ x: 0, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.min(Math.max(z + delta, 0.5), 4));
  };

  // Handle drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `comprobante_${Date.now()}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm text-white/60 min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setZoom(z => Math.min(z + 0.25, 4))}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>

        <div className="w-px h-5 bg-white/20 mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setRotation(r => (r + 90) % 360)}
        >
          <RotateCw className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => {
            setZoom(1);
            setRotation(0);
            setPosition({ x: 0, y: 0 });
          }}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>

        <div className="w-px h-5 bg-white/20 mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
          onClick={handleDownload}
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 h-10 w-10 text-white/70 hover:text-white hover:bg-white/10 z-10"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Image container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden w-full h-full flex items-center justify-center"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-w-[90vw] max-h-[85vh] object-contain select-none transition-transform duration-200"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          }}
        />
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/30 flex items-center gap-4">
        <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded">+/-</kbd> Zoom</span>
        <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded">R</kbd> Rotar</span>
        <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded">0</kbd> Reset</span>
        <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded">Esc</kbd> Cerrar</span>
      </div>
    </div>
  );
}
