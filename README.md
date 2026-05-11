
# MongoDB Query Analyzer

一个专业的 CLI 工具，用于解析 MongoDB 导出的非标格式文本（如带 ▾ 的树形 explain 输出），自动提取查询性能指标并生成统计报告，帮助开发者快速识别和优化慢查询。

A professional CLI tool that parses non-standard MongoDB explain outputs (like tree format with ▾ symbols), automatically extracts query performance metrics, and generates statistical reports to help developers quickly identify and optimize slow queries.

## 目录 / Table of Contents

- [特性 / Features](#特性--features)
- [快速开始 / Quick Start](#快速开始--quick-start)
- [安装 / Installation](#安装--installation)
- [使用方法 / Usage](#使用方法--usage)
- [命令文档 / Command Documentation](#命令文档--command-documentation)
- [示例 / Examples](#示例--examples)
- [开发 / Development](#开发--development)

## 特性 / Features

- **多格式支持**：解析树形格式（带 ▾）、JSON 格式、MongoDB shell 格式等多种 explain 输出
- **自动格式检测**：无需指定输入格式，工具会自动识别
- **性能评分**：基于执行时间、扫描比例等计算 0-100 的性能评分
- **问题检测**：识别全表扫描、内存排序、大量文档扫描等常见问题
- **优化建议**：提供针对性的查询优化建议和索引建议
- **多格式报告**：支持 JSON、CSV、HTML 多种输出格式
- **批量处理**：支持批量分析多个查询日志文件

- **Multi-format support**: Parse tree format (with ▾), JSON format, MongoDB shell format, and other explain outputs
- **Automatic format detection**: No need to specify input format, the tool will auto-detect
- **Performance scoring**: Calculate 0-100 performance score based on execution time, scan ratio, etc.
- **Issue detection**: Identify common issues like full collection scans, in-memory sorting, large document scans
- **Optimization suggestions**: Provide targeted query optimization and index suggestions
- **Multi-format reports**: Support JSON, CSV, HTML output formats
- **Batch processing**: Support batch analysis of multiple query log files

## 快速开始 / Quick Start

### 前置要求 / Prerequisites

- Node.js 18+
- npm 或 yarn

### 快速安装 / Quick Install

```bash
# 克隆仓库 / Clone the repository
git clone &lt;your-fork-url&gt;
cd "MongoDB CLI"

# 安装依赖 / Install dependencies
npm install

# 构建项目 / Build the project
npm run build

# 链接到本地（可选）/ Link locally (optional)
npm link

# 测试工具 / Test the tool
mqa analyze examples/collscan-example.txt
```

## 安装 / Installation

### 从源码安装 / Install from Source

```bash
git clone &lt;repository-url&gt;
cd mongodb-query-analyzer
npm install
npm run build
npm link
```

### 使用 / Usage without link

如果你不想链接到全局，可以直接运行编译后的文件：

If you don't want to link globally, you can run the compiled file directly:

```bash
node dist/cli/index.js analyze examples/collscan-example.txt
```

## 使用方法 / Usage

### 基本命令 / Basic Commands

#### `mqa analyze` - 分析单个查询 / Analyze single query

```bash
# 从文件分析 / Analyze from file
mqa analyze examples/collscan-example.txt

# 指定输出格式 / Specify output format
mqa analyze examples/collscan-example.txt --format json

# 输出到文件 / Output to file
mqa analyze examples/collscan-example.txt --format html --output report.html

# 从管道输入 / Pipe input
cat examples/collscan-example.txt | mqa analyze
```

#### `mqa batch` - 批量分析 / Batch analysis

```bash
# 分析整个目录 / Analyze entire directory
mqa batch examples/

# 输出到目录 / Output to directory
mqa batch examples/ --output results/
```

### 获取帮助 / Get Help

```bash
mqa --help
mqa analyze --help
mqa batch --help
```

## 命令文档 / Command Documentation

### `analyze` 命令 / `analyze` Command

分析单个 MongoDB explain 输出。

Analyze a single MongoDB explain output.

**参数 / Arguments:**
- `file` - 输入文件路径 / Input file path

**选项 / Options:**
- `-f, --format &lt;format&gt;` - 输出格式 (json/csv/html) / Output format
- `-o, --output &lt;path&gt;` - 输出文件路径 / Output file path
- `-v, --verbose` - 详细输出 / Verbose output

### `batch` 命令 / `batch` Command

批量分析多个查询文件。

Batch analyze multiple query files.

**参数 / Arguments:**
- `dir` - 输入目录路径 / Input directory path

**选项 / Options:**
- `-f, --format &lt;format&gt;` - 输出格式 (json/csv/html) / Output format
- `-o, --output &lt;path&gt;` - 输出目录路径 / Output directory path
- `-r, --recursive` - 递归处理子目录 / Recursively process subdirectories

## 示例 / Examples

### 分析全表扫描 / Analyze collection scan

```bash
mqa analyze examples/collscan-example.txt
```

输出示例 / Output example:
```
┌─────────────────────────────────────────┐
│  MongoDB Query Analysis Report          │
├─────────────────────────────────────────┤
│  Execution Time: 245ms                  │
│  Docs Examined: 10,000                  │
│  Docs Returned: 50                      │
│  Index Used: ✗ None (COLLSCAN)          │
│  Performance Score: 35/100 ⚠️           │
├─────────────────────────────────────────┤
│  Suggestions:                           │
│  1. Create index on { status: 1 }       │
│  2. Add projection to reduce fields     │
└─────────────────────────────────────────┘
```

### 生成 HTML 报告 / Generate HTML report

```bash
mqa analyze examples/indexscan-example.txt --format html --output report.html
```

### 批量分析示例 / Batch analysis example

```bash
mqa batch examples/ --output batch-results/
```

## 开发 / Development

### 项目结构 / Project Structure

```
src/
├── cli/
│   ├── index.ts              # CLI 入口 / CLI entry
│   └── commands/
│       ├── analyze.ts        # analyze 命令
│       └── batch.ts          # batch 命令
├── parsers/
│   ├── index.ts              # 解析器入口
│   ├── format-detector.ts    # 格式检测器
│   ├── tree-parser.ts        # 树形格式解析器
│   └── json-parser.ts        # JSON 格式解析器
├── extractors/
│   └── metrics-extractor.ts  # 指标提取器
├── analyzers/
│   └── performance-analyzer.ts # 性能分析器
├── reporters/
│   ├── json-reporter.ts      # JSON 报告
│   ├── csv-reporter.ts       # CSV 报告
│   └── html-reporter.ts      # HTML 报告
├── types/
│   └── index.ts              # TypeScript 类型定义
├── utils/
│   ├── file-reader.ts        # 文件读取工具
│   └── logger.ts             # 日志工具
└── config/
    └── default.ts            # 默认配置
```

### 开发命令 / Development Commands

```bash
# 安装依赖 / Install dependencies
npm install

# 开发模式（监听文件变化）/ Development mode (watch file changes)
npm run dev

# 构建项目 / Build project
npm run build

# 运行示例 / Run examples
node dist/cli/index.js analyze examples/collscan-example.txt
```

