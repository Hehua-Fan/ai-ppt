import pptxgen from 'pptxgenjs';
import { parse } from 'svg-parser';
import { parseSVG, makeAbsolute } from 'svg-path-parser';

interface SVGElement {
  tagName: string;
  properties: { [key: string]: any };
  children: SVGElement[];
  value?: string;
}

const getProperty = (props: any, name: string, defaultValue: any = null) => {
  const camelCase = name.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
  const kebabCase = name.replace(/([A-Z])/g, '-$1').toLowerCase();
  return props[name] ?? props[camelCase] ?? props[kebabCase] ?? defaultValue;
};

// 🎨 命名颜色映射表
const namedColors: { [key: string]: string } = {
  white: '#FFFFFF',
  black: '#000000',
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  gray: '#808080',
  grey: '#808080',
  yellow: '#FFFF00',
  orange: '#FFA500',
  pink: '#FFC0CB',
};

const normalizeColor = (color: string): string | undefined => {
  if (!color || color === 'none') return undefined;
  if (color.startsWith('#')) return color;
  const lower = color.toLowerCase();
  return namedColors[lower] || color;
};

const convertCoordinates = (value: string | number, scale = 1.0): number => {
  if (value === undefined || value === null) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num * scale;
};

const makeLineStyle = (stroke: string, strokeWidth: number) => {
  const color = normalizeColor(stroke);
  return color ? { color, width: strokeWidth } : undefined;
};

const processSVGElement = (
  element: SVGElement,
  slide: any,
  viewBox: number[],
  offsetX: number,
  offsetY: number,
  scale: number
) => {
  const props = element.properties || {};
  const fillRaw = getProperty(props, 'fill', 'none');
  const strokeRaw = getProperty(props, 'stroke', 'none');
  const strokeWidth = getProperty(props, 'stroke-width') ? parseFloat(getProperty(props, 'stroke-width')) / 10 : 0;

  const fill = normalizeColor(fillRaw);
  const stroke = normalizeColor(strokeRaw);

  switch (element.tagName) {
    case 'rect': {
        const x = convertCoordinates(getProperty(props, 'x', 0), scale);
        const y = convertCoordinates(getProperty(props, 'y', 0), scale);
        const w = convertCoordinates(getProperty(props, 'width', 0), scale);
        const h = convertCoordinates(getProperty(props, 'height', 0), scale);
      
        const rx = convertCoordinates(getProperty(props, 'rx', 0), scale);
        const ry = convertCoordinates(getProperty(props, 'ry', rx), scale);
        const rounding = (rx && w > 0) ? Math.min(rx / w / 10, 0.5) : 0;
      
        const hasRoundedCorner = rounding > 0;
      
        slide.addShape(hasRoundedCorner ? 'roundRect' : 'rect', {
          x: offsetX + x,
          y: offsetY + y,
          w,
          h,
          fill,
          line: makeLineStyle(strokeRaw, strokeWidth),
          ...(hasRoundedCorner ? { rounding } : {})
        });
      
        const textElement = element.children?.find(e => e.tagName === 'text');
        const textContent = textElement?.children?.map(c =>
          typeof c === 'string' ? c : c.value || ''
        ).join('') || '';
      
        if (textContent) {
          const fontSize = getProperty(textElement?.properties || {}, 'font-size', '14');
          const fontWeight = getProperty(textElement?.properties || {}, 'font-weight', 'normal');
          const bold = fontWeight === 'bold' || fontWeight === '700' || fontWeight === 700;
          const fillColor = normalizeColor(getProperty(textElement?.properties || {}, 'fill', '#000000'));
      
          slide.addText(textContent, {
            x: offsetX + x + 0.05,
            y: offsetY + y + 0.05,
            w: w - 0.1,
            h: h - 0.1,
            align: 'center',
            valign: 'middle',
            color: fillColor || '#000000',
            fontSize: parseFloat(fontSize) * 0.8,
            bold,
            autoFit: true
          });
        }
        break;
      }
    case 'circle': {
      const cx = convertCoordinates(getProperty(props, 'cx', 0), scale);
      const cy = convertCoordinates(getProperty(props, 'cy', 0), scale);
      const r = convertCoordinates(getProperty(props, 'r', 0), scale);
      slide.addShape('ellipse', {
        x: offsetX + cx - r,
        y: offsetY + cy - r,
        w: r * 2,
        h: r * 2,
        fill,
        line: makeLineStyle(strokeRaw, strokeWidth),
      });
      break;
    }
    case 'ellipse': {
      const cx = convertCoordinates(getProperty(props, 'cx', 0), scale);
      const cy = convertCoordinates(getProperty(props, 'cy', 0), scale);
      const rx = convertCoordinates(getProperty(props, 'rx', 0), scale);
      const ry = convertCoordinates(getProperty(props, 'ry', 0), scale);
      slide.addShape('ellipse', {
        x: offsetX + cx - rx,
        y: offsetY + cy - ry,
        w: rx * 2,
        h: ry * 2,
        fill,
        line: makeLineStyle(strokeRaw, strokeWidth),
      });
      break;
    }
    case 'line': {
        // 获取原始坐标
        let x1 = convertCoordinates(getProperty(props, 'x1', 0), scale);
        let y1 = convertCoordinates(getProperty(props, 'y1', 0), scale);
        let x2 = convertCoordinates(getProperty(props, 'x2', 0), scale);
        let y2 = convertCoordinates(getProperty(props, 'y2', 0), scale);
        
        // 计算线条参数
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        const startX = Math.min(x1, x2);
        const startY = Math.min(y1, y2);
        
        // 判断箭头
        const markerEnd = getProperty(props, 'marker-end', '');
        const hasArrow = markerEnd.includes('arrowhead') || markerEnd.includes('marker');
        
        // 判断虚线样式
        const dasharray = getProperty(props, 'stroke-dasharray');
        let dashType: 'solid' | 'dash' | 'dot' | 'sysDot' | 'lgDash' = 'solid';
        if (dasharray && typeof dasharray === 'string') {
          if (dasharray.includes('5')) dashType = 'dash';
          else if (dasharray.includes('1')) dashType = 'dot';
        }
        
        // 创建线条 - 使用简单的方向判断
        const line = {
          x: offsetX + startX,
          y: offsetY + startY,
          w: width,
          h: height,
          flipV: (y1 > y2 && x1 < x2) || (y1 < y2 && x1 > x2),
          line: {
            color: stroke || '#000',
            width: strokeWidth || 1,
            dashType,
            endArrowType: hasArrow ? 'triangle' : 'none',
          }
        };
        
        slide.addShape('line', line);
        break;
      }
      case 'text': {
        const x = convertCoordinates(getProperty(props, 'x', 0), scale);
        const y = convertCoordinates(getProperty(props, 'y', 0), scale);
        const originalFontSize = getProperty(props, 'font-size') ? parseFloat(getProperty(props, 'font-size')) : 12;
        const fontSize = originalFontSize * 0.55;
        const textAnchor = getProperty(props, 'text-anchor', 'start');
        const fillColor = fill || '#000000';
        const text = element.children?.map(c => typeof c === 'string' ? c : c.value || '').join('') || '';
        const bold = getProperty(props, 'font-weight', 'normal') === 'bold';
        const italic = getProperty(props, 'font-style', 'normal') === 'italic';
      
        // ✅ 动态估算文字宽度（英寸）
        const fontSizeInch = fontSize / 60;
        const estimatedWidth = Math.max(1.5, fontSizeInch * text.length); // 最小宽度避免过小
      
        // ✅ 设置文字对齐和 anchor 偏移
        let align: 'left' | 'center' | 'right' = 'left';
        let anchorAdjust = 0;
      
        if (textAnchor === 'middle') {
          align = 'center';
          anchorAdjust = -estimatedWidth / 2;
        } else if (textAnchor === 'end') {
          align = 'right';
          anchorAdjust = -estimatedWidth;
        }
      
        // ✅ baseline 调整（确保贴近 SVG 基线）
        const baselineOffset = fontSize / 50;
      
        slide.addText(text, {
          x: offsetX + x + anchorAdjust,
          y: offsetY + y - baselineOffset,
          w: estimatedWidth,
          h: fontSizeInch * 1.4, // 稍微放大行高
          color: fillColor,
          fontSize,
          align,
          valign: 'top',
          bold,
          italic,
          autoFit: true,
        });
        break;
      }      
    case 'g': {
      element.children?.forEach(child =>
        processSVGElement(child, slide, viewBox, offsetX, offsetY, scale)
      );
      break;
    }
    case 'path': {
        const d = getProperty(props, 'd');
        if (!d) break;
      
        // 🔍 判断是否有箭头
        const markerEnd = getProperty(props, 'marker-end', '');
        const hasArrow = markerEnd.includes('arrowhead') || markerEnd.includes('marker');
      
        try {
          const commands = makeAbsolute(parseSVG(d));
          const points: [number, number][] = [];
      
          for (const cmd of commands) {
            if ('x' in cmd && 'y' in cmd) {
              const x = convertCoordinates(cmd.x, scale);
              const y = convertCoordinates(cmd.y, scale);
              points.push([offsetX + x, offsetY + y]);
            }
      
            // ⚠️ 如果是贝塞尔曲线（C、S、Q），你也可以在这里进一步插值采样控制点
            // 暂时先直接连线近似
          }
      
          // 转折点之间连线（近似弯曲路径）
          for (let i = 0; i < points.length - 1; i++) {
            const [x1, y1] = points[i];
            const [x2, y2] = points[i + 1];
            slide.addShape('line', {
              x: x1,
              y: y1,
              w: x2 - x1,
              h: y2 - y1,
              line: {
                color: stroke || '#000',
                width: strokeWidth || 1,
                endArrowType: hasArrow && i === points.length - 2 ? 'triangle' : 'none', // ✅ 最后一段加箭头
              },
            });
          }
        } catch (e) {
          console.warn('path 解析失败:', e);
        }
        break;
      }      
    case 'polygon':
    case 'polyline': {
      // 可选：将 points 转折为线段绘制
      break;
    }
  }
};

export const svgToPptx = async (
  input: string,
  filename = 'presentation.pptx',
  options: {
    x?: number,
    y?: number,
    w?: number,
    h?: number,
    preserveAspectRatio?: boolean,
    scale?: number,
    slideWidth?: number,
    slideHeight?: number
  } = {}
): Promise<void> => {
  try {
    const parsed = parse(input);
    const rootElement = parsed.children[0] as SVGElement;

    const pres = new pptxgen();
    
    // 设置幻灯片大小为16:9比例
    pres.layout = 'LAYOUT_16x9';
    
    const slide = pres.addSlide();

    // 幻灯片尺寸
    const slideWidth = options.slideWidth || 10;     // 默认10英寸宽
    const slideHeight = options.slideHeight || 5.63; // 默认5.63英寸高(16:9比例)
    
    // 目标尺寸
    const targetWidth = options.w || 9;
    const targetHeight = options.h || 5;

    // 获取SVG视图框
    const viewBoxStr = getProperty(rootElement.properties, 'viewBox');
    let viewBox = viewBoxStr ? viewBoxStr.split(/\s+/).map(Number) : [0, 0, 1000, 600];
    
    // 获取SVG的宽高属性
    const svgWidth = getProperty(rootElement.properties, 'width');
    const svgHeight = getProperty(rootElement.properties, 'height');
    
    // 如果SVG有明确的宽高，使用它们替代viewBox的宽高
    const svgWidthValue = svgWidth ? parseFloat(svgWidth.toString()) : viewBox[2];
    const svgHeightValue = svgHeight ? parseFloat(svgHeight.toString()) : viewBox[3];

    // 计算缩放因子
    const scaleX = targetWidth / svgWidthValue;
    const scaleY = targetHeight / svgHeightValue;
    
    // 应用用户设置的比例
    const baseScale = options.preserveAspectRatio !== false
      ? Math.min(scaleX, scaleY)
      : scaleX;
    
    // 应用用户自定义比例
    const finalScale = options.scale ? baseScale * options.scale : baseScale;

    // 计算水平和垂直居中偏移
    // 这个偏移确保SVG在幻灯片上垂直居中
    const centerX = (slideWidth - svgWidthValue * finalScale) / 2;
    const centerY = (slideHeight - svgHeightValue * finalScale) / 2;
    
    // 使用用户指定的偏移，或者使用居中偏移
    const userOffsetX = options.x ?? 0; 
    const userOffsetY = options.y ?? 0;
    
    // 计算最终偏移
    // 应用-1.0英寸的垂直修正，解决PowerPoint中的位置下移问题
    const offsetX = userOffsetX + (userOffsetX === 0 ? centerX : 0);
    const offsetY = userOffsetY + (userOffsetY === 0 ? centerY : 0) - 1.0;

    console.log('SVG Dimensions:', { 
      svgWidth: svgWidthValue, 
      svgHeight: svgHeightValue,
      scale: finalScale,
      offsetX, 
      offsetY 
    });

    // 将坐标信息传递给处理函数
    rootElement.children?.forEach(child => {
      processSVGElement(child, slide, viewBox, offsetX, offsetY, finalScale);
    });

    await pres.writeFile({ fileName: filename });
  } catch (err) {
    console.error('生成PPT失败:', err);
    throw err;
  }
};
