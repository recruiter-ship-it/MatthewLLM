import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PageViewport } from 'pdfjs-dist';
import { ChevronLeft, ChevronRight } from './icons/Icons';

interface PdfViewerProps {
  pdfUrl: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPdf = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const doc = await pdfjsLib.getDocument(pdfUrl).promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNum(1);
      } catch (err: any) {
        console.error("Error loading PDF:", err);
        setError("Не удалось загрузить PDF файл.");
      } finally {
        setIsLoading(false);
      }
    };
    loadPdf();
  }, [pdfUrl]);
  
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    
    const renderPage = async () => {
        setIsLoading(true);
        const page = await pdfDoc.getPage(pageNum);
        const viewport: PageViewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        const ratio = window.devicePixelRatio || 1;
        canvas.width = viewport.width * ratio;
        canvas.height = viewport.height * ratio;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);

        const renderContext = {
            canvasContext: context,
            viewport: viewport,
        };
        
        await page.render(renderContext as any).promise;
        setIsLoading(false);
    }
    renderPage();
  }, [pdfDoc, pageNum]);

  const goToPrevPage = () => setPageNum(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setPageNum(prev => Math.min(numPages, prev + 1));

  return (
    <div className="w-full h-full flex flex-col">
        {error && <div className="m-auto text-red-600">{error}</div>}
        
        <div className="flex-grow overflow-auto flex justify-center items-start p-4 relative">
            {isLoading && !error && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <canvas ref={canvasRef} className="max-w-full h-auto" />
        </div>

        {numPages > 0 && !error && (
            <div className="flex-shrink-0 flex items-center justify-center gap-4 p-2 bg-gray-100 border-t">
                <button onClick={goToPrevPage} disabled={pageNum <= 1} className="p-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200">
                    <ChevronLeft className="w-5 h-5 text-gray-700"/>
                </button>
                <span className="text-sm font-medium text-gray-700">
                    Стр. {pageNum} из {numPages}
                </span>
                <button onClick={goToNextPage} disabled={pageNum >= numPages} className="p-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200">
                    <ChevronRight className="w-5 h-5 text-gray-700"/>
                </button>
            </div>
        )}
    </div>
  )
};

export default PdfViewer;