# AI PPT Generator - 图片转可编辑PPT形状工具

一个强大的工具，可以将SVG和普通图片（PNG、JPG）转换为可编辑的PowerPoint形状，支持group/ungroup功能。

## 核心功能

- **SVG转换**：将SVG文件转换为可编辑的PPT形状
- **图像识别**：使用OpenAI Vision API分析图片中的形状和文本
- **结构化转换**：将识别到的结构转换为PowerPoint中的可编辑形状
- **分组支持**：可以在PowerPoint中对相关元素进行分组操作
- **图像类型优化**：针对流程图、UI设计图、数据图表和手绘草图提供优化提示

## 技术架构

### 前端
- Next.js 15
- React 19
- pptxgenjs (PowerPoint生成)
- Tailwind CSS

### 后端
- Next.js API Routes
- OpenAI GPT-4o Vision API
- SVG生成与处理

## 快速开始

### 配置环境变量

创建一个`.env.local`文件并添加:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### 启动应用

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 处理流程

1. **图像上传**：用户上传SVG或PNG/JPG图片
2. **结构识别**：
   - SVG：直接解析SVG结构
   - 图片：使用OpenAI Vision API进行图像分析，提取结构化信息
3. **PPT生成**：将识别到的结构转换为可编辑的PPT形状
4. **下载PPT**：生成可供下载的PPTX文件

## 项目结构

```
ai-ppt/
├── app/                    # 前端Next.js应用
│   ├── page.tsx            # 主页面
│   └── api/                # API路由
│       └── ai/             # OpenAI集成
├── components/             # React组件
│   └── SvgUploader.tsx     # 文件上传和处理组件
└── package.json            # 项目依赖
```

## 特色功能

- **图像类型选择**：可以指定图像类型（流程图、UI设计图、数据图表、手绘草图），提高识别精度
- **实时预览**：识别后生成SVG预览，直观展示AI识别结果
- **自动生成PPT**：一键转换为可编辑的PowerPoint演示文稿

## 后续改进

- 增强图像识别精度
- 支持更多形状类型
- 智能布局分析
- 批量处理功能

## 许可证

MIT
