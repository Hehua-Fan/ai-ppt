'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { svgToPptx } from '../utils/svgToPptx';
import toast from 'react-hot-toast';

interface SvgToPptxProps {
  svgContent: string;
  title?: string;
}

const SvgToPptx = ({ svgContent, title = 'SVG to PowerPoint' }: SvgToPptxProps) => {
  // 添加一个state表示组件是否已经挂载到客户端，避免服务端渲染问题
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'pptx' | 'code'>('pptx');
  const [svgScale, setSvgScale] = useState(0.85); 
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  
  // 保存原始宽高和缩放比例
  const [originalDimensions, setOriginalDimensions] = useState({
    w: 9,
    h: 6.5,
    aspectRatio: 9 / 6.5,
    scale: 0.85
  });
  
  // PPT preview settings
  const [pptOptions, setPptOptions] = useState({
    x: 0,
    y: 0,
    w: 9,
    h: 6.5,
    preserveAspectRatio: true,
  });

  // 幻灯片常量 - PowerPoint默认16:9比例
  const SLIDE_WIDTH_INCHES = 10; // 幻灯片宽度(英寸)
  const SLIDE_HEIGHT_INCHES = 5.63; // 幻灯片高度(英寸) - 16:9比例

  // 预览区域参数 - 重要：确保这些值与实际UI尺寸匹配
  const PREVIEW_WIDTH = 510; // 预览区域宽度(像素)
  const PREVIEW_HEIGHT = 287; // 预览区域高度(像素) - 保持16:9比例
  const PREVIEW_LEFT = 195; // 预览区域左边距(像素)
  const PREVIEW_TOP = 116; // 预览区域顶边距(像素)

  // 确保组件只在客户端渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 在组件初始化或SVG内容变化时保存原始尺寸
  useEffect(() => {
    if (svgContent) {
      setOriginalDimensions({
        w: pptOptions.w,
        h: pptOptions.h,
        aspectRatio: pptOptions.w / pptOptions.h,
        scale: svgScale
      });
    }
  }, [svgContent, pptOptions.w, pptOptions.h, svgScale]);

  // 处理缩放比例变化
  const handleScaleChange = (newScale: number) => {
    setSvgScale(newScale);
    
    if (pptOptions.preserveAspectRatio) {
      // 计算比例系数 - 新缩放比例相对于原始缩放比例
      const scaleFactor = newScale / originalDimensions.scale;
      
      // 同比例调整宽高
      const newWidth = originalDimensions.w * scaleFactor;
      const newHeight = originalDimensions.h * scaleFactor;
      
      setPptOptions({
        ...pptOptions,
        w: parseFloat(newWidth.toFixed(2)),
        h: parseFloat(newHeight.toFixed(2))
      });
    }
  };

  // Handle drag events for SVG positioning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 获取当前SVG元素
    const svgContainer = e.currentTarget as HTMLElement;
    
    if (svgContainer && svgContainer.classList.contains('svg-in-ppt')) {
      e.preventDefault();
      e.stopPropagation(); // 防止事件传播到预览区域
      
      // 计算鼠标点击位置相对于SVG元素的偏移
      const svgRect = svgContainer.getBoundingClientRect();
      
      setDragOffset({
        x: e.clientX - svgRect.left,
        y: e.clientY - svgRect.top
      });
      
      setIsDragging(true);
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !previewRef.current) return;
    
    e.preventDefault();
    
    const container = previewRef.current;
    const slideArea = container.querySelector('[data-slide="true"]') as HTMLElement;
    const slideRect = slideArea.getBoundingClientRect();
    
    // 计算新位置相对于幻灯片的位置（以幻灯片左上角为原点(0,0)）
    const newX = e.clientX - slideRect.left - dragOffset.x;
    const newY = e.clientY - slideRect.top - dragOffset.y;
    
    // 转换为PowerPoint英寸，使用预览区域的实际尺寸
    const pptX = (newX / PREVIEW_WIDTH) * SLIDE_WIDTH_INCHES;
    
    // 添加 1.0 英寸的偏移，以匹配 -1.0 英寸显示偏移
    const pptY = (newY / PREVIEW_HEIGHT) * SLIDE_HEIGHT_INCHES + 1.0;
    
    // 更新位置，不添加边界限制
    setPptOptions({
      ...pptOptions,
      x: pptX,
      y: pptY
    });
  }, [isDragging, dragOffset, pptOptions, previewRef, PREVIEW_WIDTH, PREVIEW_HEIGHT, SLIDE_WIDTH_INCHES, SLIDE_HEIGHT_INCHES]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    // Add global event handlers for drag operations
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [isDragging, handleMouseUp, handleMouseMove]);

  const handleConvertAndDownload = async () => {
    if (!svgContent) {
      toast.error('没有可用的SVG内容');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('正在生成PowerPoint...');

    try {
      const filename = `${title.replace(/\s+/g, '_')}.pptx`;

      // 使用16:9的PowerPoint尺寸并传递缩放比例
      const finalOptions = {
        ...pptOptions,
        slideWidth: SLIDE_WIDTH_INCHES,
        slideHeight: SLIDE_HEIGHT_INCHES,
        scale: svgScale
      };

      await svgToPptx(svgContent, filename, finalOptions);
      toast.success('PowerPoint已生成并开始下载');
    } catch (error) {
      console.error('转换失败:', error);
      toast.error(`生成PowerPoint失败: ${(error as Error).message}`);
    } finally {
      setLoading(false);
      toast.dismiss(loadingToast);
    }
  };

  const isDisabled = loading || !svgContent;

  // 如果组件尚未挂载到客户端，返回空或加载状态
  if (!isMounted) {
    return <div className="p-2 text-center">加载中...</div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-medium">{title}</h2>
        <div className="flex border border-gray-200 rounded-md overflow-hidden">
          <button
            className={`px-3 py-1.5 text-sm transition cursor-pointer ${previewMode === 'pptx' ? 'bg-blue-50 text-blue-600 font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setPreviewMode('pptx')}
          >
            PPT预览
          </button>
          <button
            className={`px-3 py-1.5 text-sm transition cursor-pointer ${previewMode === 'code' ? 'bg-blue-50 text-blue-600 font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setPreviewMode('code')}
          >
            SVG代码
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="border rounded-md bg-gray-50 overflow-hidden">
          {previewMode === 'pptx' ? (
            <div className="w-full flex flex-col items-center justify-center p-2">
              {/* PowerPoint slide preview with extended background */}
              <div 
                className="relative shadow-md rounded-md overflow-hidden" 
                style={{ 
                  width: '900px', 
                  height: '520px',
                  backgroundColor: '#f0f0f0', // 更清爽的背景色
                  position: 'relative',
                }}
                ref={previewRef}
              >
                {/* 实际幻灯片区域（白色背景） - 使用16:9比例，对应PowerPoint默认尺寸 */}
                <div 
                  className="absolute shadow-sm" 
                  data-slide="true"
                  style={{
                    width: `${PREVIEW_WIDTH}px`, // 使用常量定义宽度
                    height: `${PREVIEW_HEIGHT}px`, // 使用常量定义高度
                    left: `${PREVIEW_LEFT}px`, // 使用常量定义左边距
                    top: `${PREVIEW_TOP}px`, // 使用常量定义顶边距
                    backgroundColor: 'white',
                  }}
                >
                  {/* 幻灯片网格背景 */}
                  <div 
                    className="absolute w-full h-full" 
                    style={{
                      backgroundImage: 'linear-gradient(rgba(200, 200, 200, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(200, 200, 200, 0.1) 1px, transparent 1px)',
                      backgroundSize: '25px 14px', // 网格尺寸调整为与PowerPoint中一致
                      backgroundPosition: 'center center',
                    }}
                  ></div>
                </div>

                {/* SVG content - 基于幻灯片左上角(0,0)定位 */}
                <div 
                  className={`svg-in-ppt ${isHovering || isDragging ? 'ring-2 ring-blue-400' : ''}`}
                  data-draggable="true"
                  style={{
                    position: 'absolute',
                    // 精确定位：使用常量确保一致性，应用-1.0英寸的垂直偏移以匹配PowerPoint输出
                    left: `${PREVIEW_LEFT + (pptOptions.x / SLIDE_WIDTH_INCHES) * PREVIEW_WIDTH}px`,
                    top: `${PREVIEW_TOP + ((pptOptions.y - 1.0) / SLIDE_HEIGHT_INCHES) * PREVIEW_HEIGHT}px`,
                    width: `${(pptOptions.w / SLIDE_WIDTH_INCHES) * PREVIEW_WIDTH}px`,
                    height: `${(pptOptions.h / SLIDE_HEIGHT_INCHES) * PREVIEW_HEIGHT}px`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    overflow: 'visible',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    padding: 0,
                    margin: 0,
                    transition: 'box-shadow 0.2s ease, background-color 0.2s ease',
                    backgroundColor: isHovering || isDragging ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                >
                  {/* Drag handle indicator that only shows on hover */}
                  {(isHovering || isDragging) && (
                    <div 
                      className="absolute top-1 right-1 bg-blue-500 text-white p-1 rounded-md z-10 text-xs shadow-sm opacity-80"
                      style={{ pointerEvents: 'none' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </div>
                  )}
                  <div 
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                      transform: `scale(${svgScale})`,
                      transformOrigin: 'top left',
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    <div 
                      className="svg-container" 
                      style={{ 
                        width: '100%', 
                        height: '100%',
                        padding: 0,
                        margin: 0,
                        display: 'block',
                      }} 
                      dangerouslySetInnerHTML={{ __html: svgContent }} 
                    />
                  </div>
                </div>
              </div>
              
              {/* 简化的控制面板 */}
              <div className="flex justify-between items-center w-full max-w-2xl mt-4 px-1">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      handleScaleChange(0.85);
                      // 重置为原始尺寸和位置
                      setPptOptions({
                        ...pptOptions,
                        x: 0,
                        y: 0,
                        w: originalDimensions.w,
                        h: originalDimensions.h
                      });
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition cursor-pointer"
                  >
                    重置
                </button>
                  
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">缩放:</span>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="1.5" 
                      step="0.05" 
                      value={svgScale} 
                      onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                      className="w-24 cursor-pointer"
                    />
                    <span className="text-sm font-medium w-10 text-center">{Math.round(svgScale * 100)}%</span>
                  </div>
                </div>
                
                <div>
                  <span className="text-xs text-gray-500 mx-2">X: {pptOptions.x.toFixed(1)}&quot; Y: {pptOptions.y.toFixed(1)}&quot; </span>
                  <span className="text-xs text-gray-500">W: {pptOptions.w.toFixed(1)}&quot; H: {pptOptions.h.toFixed(1)}&quot;</span>
                </div>
              </div>
              
              {/* 精简的数值调整面板 */}
              <div className="w-full max-w-2xl mt-3 grid grid-cols-4 gap-3">
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1 px-1">
                    <span>X位置</span>
                  </div>
                  <input 
                    type="number" 
                    step="0.1"
                    value={pptOptions.x} 
                    onChange={(e) => setPptOptions({...pptOptions, x: parseFloat(e.target.value)})}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1 px-1">
                    <span>Y位置</span>
                  </div>
                  <input 
                    type="number" 
                    step="0.1"
                    value={pptOptions.y} 
                    onChange={(e) => setPptOptions({...pptOptions, y: parseFloat(e.target.value)})}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1 px-1">
                    <span>宽度</span>
                  </div>
                  <input 
                    type="number" 
                    min="0.1" 
                    step="0.5"
                    value={pptOptions.w} 
                    onChange={(e) => setPptOptions({...pptOptions, w: parseFloat(e.target.value)})}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1 px-1">
                    <span>高度</span>
                  </div>
                  <input 
                    type="number" 
                    min="0.1" 
                    step="0.5"
                    value={pptOptions.h} 
                    onChange={(e) => setPptOptions({...pptOptions, h: parseFloat(e.target.value)})}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <pre 
              className="text-sm overflow-auto max-h-[520px] p-3 bg-gray-100 rounded-md text-gray-800 font-mono whitespace-pre"
              style={{ overflowX: 'auto', overflowY: 'auto' }}
            >
              {svgContent}
            </pre>
          )}
        </div>
      </div>

      <button
        onClick={handleConvertAndDownload}
        disabled={isDisabled}
        className={`w-full py-2.5 px-4 rounded-md text-white font-medium flex items-center justify-center cursor-pointer ${
          isDisabled ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
        } transition`}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {loading ? '正在生成...' : '下载PowerPoint'}
      </button>
    </div>
  );
};

export default SvgToPptx;