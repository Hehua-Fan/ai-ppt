import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const SVG_ANALYSIS_SYSTEM_PROMPT = `你是一个SVG分析专家，能够将SVG内容精确分析为结构化的JSON格式。

分析SVG内容并返回一个JSON数组，该数组包含SVG中所有视觉元素的信息。
每种元素类型应包含以下属性：

1. 文本元素:
{
  "type": "text",
  "text": "文本内容",
  "x": X坐标(英寸单位，0-10之间),
  "y": Y坐标(英寸单位，0-7.5之间),
  "fontSize": 字体大小(12-40),
  "color": "颜色代码"
}

2. 矩形元素:
{
  "type": "rect",
  "x": 左上角X坐标(英寸单位),
  "y": 左上角Y坐标(英寸单位),
  "w": 宽度(英寸单位),
  "h": 高度(英寸单位),
  "fill": "填充颜色",
  "stroke": "边框颜色",
  "strokeWidth": 边框宽度,
  "text": "矩形内文本内容"(如果有)
}

3. 圆形元素:
{
  "type": "circle",
  "x": 中心X坐标(英寸单位),
  "y": 中心Y坐标(英寸单位),
  "radius": 半径(英寸单位),
  "fill": "填充颜色",
  "stroke": "边框颜色"
}

4. 椭圆元素:
{
  "type": "ellipse",
  "x": 中心X坐标(英寸单位),
  "y": 中心Y坐标(英寸单位),
  "w": 宽度(英寸单位),
  "h": 高度(英寸单位),
  "fill": "填充颜色",
  "stroke": "边框颜色"
}

5. 线段元素:
{
  "type": "line",
  "x1": 起点X坐标(英寸单位),
  "y1": 起点Y坐标(英寸单位),
  "x2": 终点X坐标(英寸单位),
  "y2": 终点Y坐标(英寸单位),
  "color": "线条颜色",
  "width": 线条宽度
}

6. 路径元素(简化为连接点):
{
  "type": "path",
  "points": [[x1,y1], [x2,y2], ...],
  "fill": "填充颜色",
  "stroke": "边框颜色"
}

注意:
- PowerPoint幻灯片尺寸通常为10英寸宽x7.5英寸高，请将SVG的坐标转换为英寸单位，考虑合适的比例和位置。
- 对于文本内容，正确识别字体大小和位置信息。
- 对于颜色，尽量使用十六进制颜色代码(#RRGGBB)。
- 保持元素的相对位置和比例关系。
- 你的回复必须是一个有效的JSON数组，不要包含任何其他文本或解释。

示例输出:
[
  { "type": "text", "text": "标题", "x": 5.0, "y": 0.5, "fontSize": 24, "color": "#000000" },
  { "type": "rect", "x": 1.0, "y": 2.0, "w": 3.0, "h": 1.5, "fill": "#4285F4", "stroke": "#000000", "strokeWidth": 2 },
  { "type": "circle", "x": 7.0, "y": 3.0, "radius": 1.0, "fill": "#FBBC05", "stroke": "#000000" }
]`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const svgContent = formData.get('svgContent');

    if (!svgContent || typeof svgContent !== 'string') {
      return NextResponse.json({ error: 'SVG内容是必需的' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: '缺少 Claude API 密钥' }, { status: 500 });
    }

    // 调用 Claude 3.5 API 分析 SVG 内容
    const message = await claude.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4000,
      system: SVG_ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `请分析以下SVG内容并返回结构化的JSON格式：\n\n${svgContent}`,
            },
          ],
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || !('text' in textContent)) {
      return NextResponse.json({ error: 'Claude 未返回有效文本' }, { status: 500 });
    }

    // 尝试解析返回的JSON内容
    try {
      const elementsJson = JSON.parse(textContent.text);
      return NextResponse.json({ 
        success: true,
        svgContent,
        elementsJson
      });
    } catch (parseError) {
      console.error('解析Claude返回的JSON失败:', parseError);
      return NextResponse.json({ 
        error: '解析SVG结构失败', 
        rawResponse: textContent.text 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('SVG处理错误:', error);
    return NextResponse.json({ error: `处理SVG出错: ${(error as Error).message}` }, { status: 500 });
  }
} 