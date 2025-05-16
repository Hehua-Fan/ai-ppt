'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import SvgToPptx from './SvgToPptx';

interface SvgExtractorProps {
  content: string;
}

const SvgExtractor = ({ content }: SvgExtractorProps) => {
  const [extractedSvgs, setExtractedSvgs] = useState<string[]>([]);
  const [selectedSvgIndex, setSelectedSvgIndex] = useState<number>(0);

  // Extract SVG content from the Claude response
  useEffect(() => {
    if (!content) return;

    const extractSvgs = () => {
      const svgRegex = /<svg[\s\S]*?<\/svg>/gi;
      const matches = content.match(svgRegex) || [];
      return matches;
    };

    const svgs = extractSvgs();
    setExtractedSvgs(svgs);
    
    if (svgs.length > 0) {
      toast.success(`找到 ${svgs.length} 个SVG内容`);
    } else {
      toast.error('未找到SVG内容');
    }
  }, [content]);

  if (extractedSvgs.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">提取的SVG内容</h2>
      
      {extractedSvgs.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择SVG ({extractedSvgs.length} 个可用)
          </label>
          <div className="flex flex-wrap gap-2">
            {extractedSvgs.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedSvgIndex(index)}
                className={`px-3 py-1 rounded-md ${
                  selectedSvgIndex === index
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                SVG {index + 1}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <SvgToPptx 
        svgContent={extractedSvgs[selectedSvgIndex]} 
        title={`SVG ${selectedSvgIndex + 1}`} 
      />
    </div>
  );
};

export default SvgExtractor; 