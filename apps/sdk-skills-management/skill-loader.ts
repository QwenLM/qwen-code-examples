/**
 * Qwen Code SDK Chimp - Skill Loader
 * Load and parse Skill content
 */

import * as fs from 'fs';
import * as path from 'path';
import type { SkillContent } from './skill-types';

/**
 * Load specified Skill
 * @param skillsDir Skill root directory
 * @param skillName Skill name (folder name)
 * @returns Skill content
 */
export function loadSkill(skillsDir: string, skillName: string): SkillContent {
  const skillPath = path.join(skillsDir, skillName);

  // Verify directory exists
  if (!fs.existsSync(skillPath)) {
    throw new Error(`Skill does not exist: ${skillPath}`);
  }

  const stat = fs.statSync(skillPath);
  if (!stat.isDirectory()) {
    throw new Error(`Skill path is not a directory: ${skillPath}`);
  }

  console.log(`[SkillLoader] Loading skill: ${skillName}`);

  // Read SKILL.md (required)
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    throw new Error(`Skill missing SKILL.md file: ${skillMdPath}`);
  }

  const skillMd = fs.readFileSync(skillMdPath, 'utf-8');

  // Read README.md (optional)
  const readmeMdPath = path.join(skillPath, 'README.md');
  const readmeMd = fs.existsSync(readmeMdPath)
    ? fs.readFileSync(readmeMdPath, 'utf-8')
    : undefined;

  // Parse metadata
  const metadata = parseMetadata(skillMd);

  return {
    name: skillName,
    path: skillPath,
    skillMd,
    readmeMd,
    metadata,
  };
}

/**
 * List all available Skills
 * @param skillsDir Skill root directory
 */
export function listSkills(skillsDir: string): string[] {
  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  const entries = fs.readdirSync(skillsDir);
  return entries.filter((entry) => {
    const fullPath = path.join(skillsDir, entry);
    const stat = fs.statSync(fullPath);
    return stat.isDirectory() && fs.existsSync(path.join(fullPath, 'SKILL.md'));
  });
}

/**
 * Check if Skill exists
 */
export function skillExists(skillsDir: string, skillName: string): boolean {
  const skillPath = path.join(skillsDir, skillName);
  return fs.existsSync(skillPath) && fs.existsSync(path.join(skillPath, 'SKILL.md'));
}

/**
 * Parse SKILL.md metadata
 */
function parseMetadata(skillMd: string): SkillContent['metadata'] {
  const metadata: SkillContent['metadata'] = {};

  // Parse title
  const titleMatch = skillMd.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }

  // Parse Description section
  const descMatch = skillMd.match(/##\s*Description\s*\n([\s\S]*?)(?=##|$)/i);
  if (descMatch) {
    metadata.description = descMatch[1].trim();
  }

  // Parse Functionality section
  const funcMatch = skillMd.match(/##\s*Functionality\s*\n([\s\S]*?)(?=##|$)/i);
  if (funcMatch) {
    metadata.functionality = funcMatch[1].trim();
  }

  // Parse Usage section
  const usageMatch = skillMd.match(/##\s*Usage\s*\n([\s\S]*?)(?=##|$)/i);
  if (usageMatch) {
    metadata.usage = usageMatch[1].trim();
  }

  return metadata;
}

/**
 * Build system prompt
 */
export function buildSystemPrompt(skillContent: SkillContent): string {
  const parts: string[] = [];

  parts.push(`You are a professional ${skillContent.metadata?.title || skillContent.name} assistant.`);
  parts.push('');

  if (skillContent.metadata?.description) {
    parts.push('## Description');
    parts.push(skillContent.metadata.description);
    parts.push('');
  }

  parts.push('## Functionality');
  parts.push(skillContent.skillMd);
  parts.push('');

  if (skillContent.readmeMd) {
    parts.push('## Detailed Description');
    parts.push(skillContent.readmeMd);
    parts.push('');
  }

  parts.push('## Interaction Rules');
  parts.push('1. Carefully analyze user input and understand their intent');
  parts.push('2. Execute tasks based on skill functionality');
  parts.push('3. If information is insufficient, ask the user for more details');
  parts.push('4. Present final results in structured format when appropriate');
  parts.push('');

  return parts.join('\n');
}

export default { loadSkill, listSkills, skillExists, buildSystemPrompt };
