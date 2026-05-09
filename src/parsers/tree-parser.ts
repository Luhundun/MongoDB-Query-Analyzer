import { ExplainOutput, PlanStage, ExecutionStats, QueryPlanner } from '../types';

interface TreeNode {
  key: string;
  value: string | number | boolean | null;
  children: TreeNode[];
  level: number;
}

export function parseTreeFormat(input: string): ExplainOutput {
  const lines = input.split('\n').filter(line => line.trim());
  const root = buildTree(lines);
  return convertToExplainOutput(root);
}

function buildTree(lines: string[]): TreeNode {
  const root: TreeNode = { key: 'root', value: null, children: [], level: -1 };
  const stack: TreeNode[] = [root];
  
  for (const line of lines) {
    const { level, content } = parseLine(line);
    const node = parseNodeContent(content, level);
    
    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  
  return root;
}

function parseLine(line: string): { level: number; content: string } {
  const treeChars = /[└├│▾▸─\-\s]*/;
  const match = line.match(/^([└├│▾▸─\-\s]*)(.*)$/);
  
  if (!match) {
    return { level: 0, content: line.trim() };
  }
  
  const prefix = match[1];
  const content = match[2].trim();
  
  // Calculate level based on indentation and tree characters
  const indentMatch = prefix.match(/\s/g);
  const indent = indentMatch ? indentMatch.length : 0;
  const hasTreeChar = /[└├]/.test(prefix);
  const level = Math.floor(indent / 2) + (hasTreeChar ? 1 : 0);
  
  return { level, content };
}

function parseNodeContent(content: string, level: number): TreeNode {
  // Remove tree characters from content
  const cleanContent = content.replace(/^[└├│▾▸─\-\s]*/, '').trim();
  
  // Try to parse key-value pair
  const colonIndex = cleanContent.indexOf(':');
  
  if (colonIndex > 0) {
    const key = cleanContent.substring(0, colonIndex).trim();
    const valueStr = cleanContent.substring(colonIndex + 1).trim();
    const value = parseValue(valueStr);
    
    return { key, value, children: [], level };
  }
  
  // Check if it's a stage name
  if (isStageName(cleanContent)) {
    return { key: 'stage', value: cleanContent, children: [], level };
  }
  
  return { key: cleanContent, value: null, children: [], level };
}

function parseValue(valueStr: string): string | number | boolean | null {
  const trimmed = valueStr.trim();
  
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
    return null;
  }
  
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  
  if (/^-?\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  
  if (/^-?\d+\.\d+$/.test(trimmed)) {
    return parseFloat(trimmed);
  }
  
  // Remove quotes if present
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  
  return trimmed;
}

function isStageName(value: string): boolean {
  const stageNames = [
    'COLLSCAN', 'IXSCAN', 'FETCH', 'SHARD_MERGE', 'SHARDING_FILTER',
    'SORT', 'LIMIT', 'SKIP', 'COUNT', 'COUNT_SCAN', 'IDHACK',
    'TEXT', 'PROJECTION', 'GROUP', 'MATCH', 'UNWIND', 'LOOKUP',
    'SORT_MERGE', 'OR', 'AND'
  ];
  
  const upperValue = value.toUpperCase().trim();
  // Check if the value is exactly a stage name or starts with one
  return stageNames.some(stage => 
    upperValue === stage || upperValue.startsWith(stage + ' ')
  );
}

function convertToExplainOutput(root: TreeNode): ExplainOutput {
  const output: ExplainOutput = {};
  
  for (const child of root.children) {
    if (child.key === 'queryPlanner' || child.children.some(c => c.key === 'winningPlan')) {
      output.queryPlanner = extractQueryPlanner(child);
    }
    if (child.key === 'executionStats' || child.children.some(c => c.key === 'executionStages')) {
      output.executionStats = extractExecutionStats(child);
    }
  }
  
  // If no explicit sections found, try to infer from structure
  if (!output.queryPlanner && !output.executionStats) {
    const stages = findStages(root);
    if (stages.length > 0) {
      output.executionStats = {
        executionSuccess: true,
        nReturned: extractNumberValue(root, 'nReturned') || 0,
        executionTimeMillis: extractNumberValue(root, 'executionTimeMillis') || 0,
        totalKeysExamined: extractNumberValue(root, 'totalKeysExamined') || 0,
        totalDocsExamined: extractNumberValue(root, 'totalDocsExamined') || 0,
        executionStages: stages[0]
      };
    }
  }
  
  return output;
}

function extractQueryPlanner(node: TreeNode): QueryPlanner {
  const planner: QueryPlanner = {
    namespace: extractStringValue(node, 'namespace') || 'unknown.collection',
    indexFilterSet: extractBooleanValue(node, 'indexFilterSet') || false,
    parsedQuery: extractObjectValue(node, 'parsedQuery') || {},
    winningPlan: extractPlanStage(findChildByKey(node, 'winningPlan') || node)
  };
  
  const rejectedPlansNode = findChildByKey(node, 'rejectedPlans');
  if (rejectedPlansNode && rejectedPlansNode.children.length > 0) {
    planner.rejectedPlans = rejectedPlansNode.children.map(extractPlanStage);
  }
  
  return planner;
}

function extractExecutionStats(node: TreeNode): ExecutionStats {
  const stats: ExecutionStats = {
    executionSuccess: extractBooleanValue(node, 'executionSuccess') ?? true,
    nReturned: extractNumberValue(node, 'nReturned') || 0,
    executionTimeMillis: extractNumberValue(node, 'executionTimeMillis') || 0,
    totalKeysExamined: extractNumberValue(node, 'totalKeysExamined') || 0,
    totalDocsExamined: extractNumberValue(node, 'totalDocsExamined') || 0,
    executionStages: extractPlanStage(findChildByKey(node, 'executionStages') || node)
  };
  
  return stats;
}

function extractPlanStage(node: TreeNode): PlanStage {
  const stage: PlanStage = {
    stage: extractStringValue(node, 'stage') || 'UNKNOWN'
  };
  
  const nReturned = extractNumberValue(node, 'nReturned');
  if (nReturned !== null) stage.nReturned = nReturned;
  
  const executionTime = extractNumberValue(node, 'executionTimeMillisEstimate');
  if (executionTime !== null) stage.executionTimeMillisEstimate = executionTime;
  
  const works = extractNumberValue(node, 'works');
  if (works !== null) stage.works = works;
  
  const advanced = extractNumberValue(node, 'advanced');
  if (advanced !== null) stage.advanced = advanced;
  
  const docsExamined = extractNumberValue(node, 'docsExamined');
  if (docsExamined !== null) stage.docsExamined = docsExamined;
  
  const keysExamined = extractNumberValue(node, 'keysExamined');
  if (keysExamined !== null) stage.keysExamined = keysExamined;
  
  const indexName = extractStringValue(node, 'indexName');
  if (indexName) stage.indexName = indexName;
  
  const keyPattern = extractObjectValue(node, 'keyPattern');
  if (keyPattern && Object.keys(keyPattern).length > 0) {
    stage.keyPattern = keyPattern as Record<string, number>;
  }
  
  const direction = extractStringValue(node, 'direction');
  if (direction) stage.direction = direction;
  
  // Extract inputStage
  const inputStageNode = findChildByKey(node, 'inputStage');
  if (inputStageNode) {
    stage.inputStage = extractPlanStage(inputStageNode);
  }
  
  // Extract inputStages (for OR stages)
  const inputStagesNode = findChildByKey(node, 'inputStages');
  if (inputStagesNode && inputStagesNode.children.length > 0) {
    stage.inputStages = inputStagesNode.children.map(extractPlanStage);
  }
  
  // If this node itself represents a stage (has stage-like children)
  if (stage.stage === 'UNKNOWN' && node.children.length > 0) {
    const stageChild = node.children.find(c => isStageName(c.key));
    if (stageChild) {
      stage.stage = String(stageChild.value || stageChild.key);
    }
  }
  
  return stage;
}

function findChildByKey(node: TreeNode, key: string): TreeNode | null {
  return node.children.find(child => child.key === key) || null;
}

function extractStringValue(node: TreeNode, key: string): string | undefined {
  const child = findChildByKey(node, key);
  if (child && typeof child.value === 'string') {
    return child.value;
  }
  return undefined;
}

function extractNumberValue(node: TreeNode, key: string): number | null {
  const child = findChildByKey(node, key);
  if (child && typeof child.value === 'number') {
    return child.value;
  }
  return null;
}

function extractBooleanValue(node: TreeNode, key: string): boolean | null {
  const child = findChildByKey(node, key);
  if (child && typeof child.value === 'boolean') {
    return child.value;
  }
  return null;
}

function extractObjectValue(node: TreeNode, key: string): Record<string, any> | null {
  const child = findChildByKey(node, key);
  if (!child) return null;
  
  const result: Record<string, any> = {};
  for (const c of child.children) {
    result[c.key] = c.value;
  }
  return result;
}

function findStages(node: TreeNode): PlanStage[] {
  const stages: PlanStage[] = [];
  
  for (const child of node.children) {
    if (isStageName(child.key) || isStageName(String(child.value))) {
      stages.push(extractPlanStage(child));
    }
    stages.push(...findStages(child));
  }
  
  return stages;
}
