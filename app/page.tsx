'use client';

import { useState, FormEvent, useEffect, useRef, ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// 使用动态导入，禁用SSR
const SvgToPptx = dynamic(() => import('@/components/SvgToPptx'), {
  ssr: false,
  loading: () => <div className="p-6 text-center">加载SVG转换组件...</div>
});

// 示例SVG集合
interface SvgExample {
  id: string;
  name: string;
  path: string; // 相对于 public 的路径
}

const EXAMPLE_SVGS: SvgExample[] = [
  { id: 'basic-shapes', name: '基础图形', path: '/basic-shapes.svg' },
  { id: 'flowchart', name: '流程图', path: '/flowchart.svg' },
  { id: 'chart', name: '简单图表', path: '/chart.svg' },
  { id: 'mindmap', name: '思维导图', path: '/mindmap.svg' },
  { id: 'ai-system-structure', name: 'AI系统架构图', path: '/ai_system_structure.svg' },
];


export default function SvgToPptxPage() {
  const [svgContent, setSvgContent] = useState<string>('');
  const [processingContent, setProcessingContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const [showExampleModal, setShowExampleModal] = useState(false);
  const [inputMethod, setInputMethod] = useState<'text' | 'file'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 确保只在客户端进行页面渲染
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelectExample = async (path: string) => {
    try {
      const res = await fetch(path);
      const svgText = await res.text();
      setSvgContent(svgText);
      setProcessingContent(svgText);
      setShowExampleModal(false);
      toast.success('已加载示例SVG');
    } catch (error) {
      toast.error('加载SVG失败');
      console.error(error);
    }
  };
  

  const handleSvgInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSvgContent(e.target.value);
    // 清除之前的处理结果
    setProcessingContent('');
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
      toast.error('请上传SVG格式的文件');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('处理SVG文件...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content.includes('<svg') && content.includes('</svg>')) {
        setSvgContent(content);
        // 自动处理SVG内容，直接显示预览
        setProcessingContent(content);
        toast.success('SVG文件已加载并处理');
      } else {
        toast.error('文件不包含有效的SVG内容');
      }
      setLoading(false);
      toast.dismiss(loadingToast);
    };
    reader.onerror = () => {
      toast.error('读取文件时出错');
      setLoading(false);
      toast.dismiss(loadingToast);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!svgContent) {
      toast.error('请输入SVG内容');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('处理SVG内容...');

    try {
      // Validate SVG content
      if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
        throw new Error('无效的SVG内容');
      }

      // 直接使用SVG
        setProcessingContent(svgContent);
        toast.success('SVG内容已准备好转换');
    } catch (error) {
      toast.error(`出错: ${(error as Error).message}`);
      console.error('处理SVG失败:', error);
    } finally {
      setLoading(false);
      toast.dismiss(loadingToast);
    }
  };

  // Modal组件
  const ExampleSvgModal = () => {
    if (!showExampleModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg w-full max-w-4xl p-5 max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">选择示例SVG</h3>
            <button 
              onClick={() => setShowExampleModal(false)}
              className="text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EXAMPLE_SVGS.map(example => (
              <div
                key={example.id}
                className="border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-md transition cursor-pointer"
                onClick={() => handleSelectExample(example.path)}  // ✅ 使用 path
              >
                <div className="text-sm font-medium mb-2">{example.name}</div>
                <div className="bg-gray-50 rounded-md p-2 h-40 flex items-center justify-center overflow-hidden">
                  {/* 使用 <img> 代替 dangerouslySetInnerHTML */}
                  <img src={example.path} alt={example.name} className="max-h-full max-w-full object-contain" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="text-xl">加载中...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-lg font-medium mb-4">输入SVG内容</h2>
            <div className="mb-4">
              <Tabs defaultValue="text" onValueChange={(value: string) => setInputMethod(value as 'text' | 'file')}>
                <TabsList className="w-full grid grid-cols-2 mb-4">
                  <TabsTrigger className="cursor-pointer" value="file">上传文件</TabsTrigger>
                  <TabsTrigger className="cursor-pointer" value="text">文本输入</TabsTrigger>
                </TabsList>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <TabsContent value="text">
                    <textarea
                      className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="在此粘贴SVG内容..."
                      value={svgContent}
                      onChange={handleSvgInputChange}
                      style={{ 
                        whiteSpace: 'pre', 
                        overflowX: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem'
                      }}
                    />
                  </TabsContent>
                  
                  <TabsContent value="file">
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 transition">
                      <input
                        type="file"
                        accept=".svg,image/svg+xml"
                        onChange={handleFileUpload}
                        className="hidden"
                        ref={fileInputRef}
                      />
                      
                      {svgContent && inputMethod === 'file' ? (
                        <div className="text-center p-4">
                          <div className="mb-3">
                            <div className="bg-green-100 text-green-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-gray-800">SVG文件已上传</p>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-4 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition cursor-pointer"
                          >
                            更换文件
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="text-center p-4 cursor-pointer" 
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="bg-gray-100 rounded-full p-3 mx-auto w-16 h-16 flex items-center justify-center mb-3">
                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-gray-700">
                            拖放SVG文件到此处或
                          </p>
                          <button className="mt-2 px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition">
                            浏览文件
                          </button>
                          <p className="mt-2 text-xs text-gray-500">
                            支持.svg格式文件
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowExampleModal(true)}
                      className="py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition cursor-pointer flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      选择示例SVG
                    </button>
                    
                    {inputMethod === 'text' && (
                      <button
                        type="submit"
                        disabled={loading || !svgContent}
                        className={`flex-1 py-2 px-4 rounded-md text-white font-medium transition ${
                          loading || !svgContent ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                      >
                        {loading ? '处理中...' : '处理SVG内容'}
                      </button>
                    )}
                  </div>
                </form>
              </Tabs>
              
              <div className="mt-2 text-sm text-gray-600">
                <p>
                  {inputMethod === 'text' 
                    ? '请在输入SVG后点击 "处理SVG内容" 按钮开始处理' 
                    : '文件上传后将自动处理SVG内容'}
                </p>
              </div>
            </div>

            {!processingContent && (
              <div className="mt-2 border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">功能说明</h3>
                <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 mb-3">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div>
                      <p className="font-medium mb-1">交互式预览</p>
                      <p>将SVG拖放到幻灯片上理想的位置，然后调整大小以完美适配</p>
                    </div>
                  </div>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  <li>输入SVG内容后点击<span className="font-medium">处理SVG内容</span>按钮</li>
                  <li>预览界面中<span className="font-medium">拖动SVG</span>调整位置</li>
                  <li>使用<span className="font-medium">控制面板</span>精确设置尺寸和位置</li>
                  <li>点击下载按钮生成包含SVG图形的PowerPoint文件</li>
                </ul>
              </div>
            )}
          </div>

          {processingContent && (
            <div>
              <SvgToPptx 
                svgContent={processingContent} 
                title="SVG转PowerPoint" 
              />
            </div>
          )}
        </div>

        {processingContent && (
          <div className="mt-8 bg-white p-5 rounded-lg shadow-sm">
            <h2 className="text-lg font-medium mb-3">使用技巧</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 bg-purple-50 p-3 rounded-md">
                <h3 className="text-sm font-medium text-purple-800 mb-2">拖放定位</h3>
                <p className="text-sm text-purple-700">使用鼠标直接拖动SVG图形到幻灯片上的任意位置。SVG可以放置在幻灯片区域内外。</p>
              </div>
              <div className="flex-1 bg-green-50 p-3 rounded-md">
                <h3 className="text-sm font-medium text-green-800 mb-2">精确调整</h3>
                <p className="text-sm text-green-700">使用控制面板上的输入框可以精确设置SVG的尺寸和位置，单位为英寸，与PowerPoint保持一致。</p>
              </div>
              <div className="flex-1 bg-yellow-50 p-3 rounded-md">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">下载与编辑</h3>
                <p className="text-sm text-yellow-700">下载生成的PowerPoint文件后，SVG中的每个元素都转换为可独立编辑的PowerPoint形状。</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 示例SVG选择模态框 */}
      <ExampleSvgModal />
    </div>
  );
} 