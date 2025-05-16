import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { fileTypeFromBuffer } from 'file-type';

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const SVG_SYSTEM_PROMPT = `分析上传的图像并以SVG格式表示其关键视觉元素。需要识别以下类型的元素：
1. 矩形 (rect): 包括位置(x,y)、尺寸(width,height)、填充颜色(fill)、边框颜色(stroke)
2. 圆形 (circle): 包括中心点(cx,cy)、半径(r)、填充颜色、边框颜色
3. 直线 (line): 包括起点(x1,y1)、终点(x2,y2)、颜色、线宽
4. 文本 (text): 包括位置(x,y)、内容、颜色、字体大小
5. 路径 (path): 如果检测到复杂形状，使用path元素

你的回复必须是一个完整、有效的SVG代码，包含<svg>标签和必要的属性，能够准确表示图像中的主要元素。
SVG的宽度和高度应设置为合适的值（比如1000x800）。
确保每个元素都有合适的样式属性（颜色、线宽等）。

请你只输出SVG代码，不要输出任何其他内容。`;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: '缺少 Claude API 密钥' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    if (!file) {
      return NextResponse.json({ error: '未上传图片' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 使用 file-type 自动判断 MIME 类型
    const type = await fileTypeFromBuffer(buffer);
    if (!type || !['image/jpeg', 'image/png'].includes(type.mime)) {
      return NextResponse.json({ error: '仅支持 JPG 和 PNG 图片' }, { status: 400 });
    }

    const base64Image = buffer.toString('base64');
    const mediaType = type.mime as 'image/jpeg' | 'image/png';

    console.log(`✅ 识别 MIME 类型为: ${mediaType}`);

    // 调用 Claude
    const message = await claude.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4000,
      system: SVG_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: '请将这张图转换为SVG格式，识别所有关键视觉元素。',
            },
          ],
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || !('text' in textContent)) {
      return NextResponse.json({ error: 'Claude 未返回有效文本' }, { status: 500 });
    }

    return NextResponse.json({
        result: textContent.text,
      });
      
  } catch (error) {
    console.error('Claude 处理失败:', error);
    return NextResponse.json(
      { error: `图像分析失败: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
