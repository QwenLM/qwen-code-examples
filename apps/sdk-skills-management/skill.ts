/**
 * Qwen Code SDK Chimp - Skill SDK
 * 
 * User provides skills folder path, skill name, and prompt, system automatically:
 * 1. Finds the skill
 * 2. Loads skill content
 * 3. Passes skill prompt to LLM
 * 4. Executes and returns results
 * 5. Supports multi-turn interaction, maintains context
 * 
 * @example
 * // Single execution
 * const result = await executeSkill({
 *   skillsDir: './skills',
 *   skillName: 'test_template_matching_skills_new',
 *   prompt: 'I need to test qwen3-coder model'
 * });
 * 
 * @example
 * // Multi-turn interaction
 * const runner = createSkillRunner('./skills', 'test_template_matching_skills_new');
 * const result1 = await runner.execute('I need to test a model');
 * if (result1.needMoreInput) {
 *   const result2 = await runner.continue('qwen3-coder model');
 * }
 */

import { SkillRunner } from './skill-runner';
import { loadSkill, listSkills, skillExists } from './skill-loader';
import type {
  SkillContent,
  SkillExecuteOptions,
  SkillExecuteResult,
  SkillConfig,
} from './skill-types';

export { SkillRunner } from './skill-runner';
export { loadSkill, listSkills, skillExists, buildSystemPrompt } from './skill-loader';
export type {
  SkillContent,
  SkillExecuteOptions,
  SkillExecuteResult,
  SkillConfig,
  SkillConversation,
} from './skill-types';
/**
 * Execute skill (single execution)
 * @param config Skill configuration
 * @param options Execution options
 * @returns Execution result
 */
export async function executeSkill(
  config: SkillConfig,
  options: SkillExecuteOptions = {}
): Promise<SkillExecuteResult> {
  // 1. Load skill content
  const skillContent = loadSkill(config.skillsDir, config.skillName);
  
  // 2. Create runner
  const runner = new SkillRunner(skillContent, options.sessionId);
  
  // 3. Execute
  try {
    const result = await runner.execute(config.prompt, options);
    
    // 4. If no further interaction needed, clean up resources
    if (!result.needMoreInput) {
      await runner.end();
    }
    
    return result;
  } catch (error) {
    await runner.end();
    throw error;
  }
}

/**
 * Create Skill Runner (for multi-turn interaction)
 * @param skillsDir Skill root directory
 * @param skillName Skill name
 * @param sessionId Optional session ID
 * @returns SkillRunner instance
 */
export function createSkillRunner(
  skillsDir: string,
  skillName: string,
  sessionId?: string
): SkillRunner {
  const skillContent = loadSkill(skillsDir, skillName);
  return new SkillRunner(skillContent, sessionId);
}

/**
 * Get skill content (without execution)
 * @param skillsDir Skill root directory
 * @param skillName Skill name
 * @returns Skill content
 */
export function getSkillContent(
  skillsDir: string,
  skillName: string
): SkillContent {
  return loadSkill(skillsDir, skillName);
}

/**
 * View all available skills
 * @param skillsDir Skill root directory
 * @returns List of skill names
 */
export function getAvailableSkills(skillsDir: string): string[] {
  return listSkills(skillsDir);
}

// Default export
export default {
  executeSkill,
  createSkillRunner,
  getSkillContent,
  getAvailableSkills,
  SkillRunner,
  loadSkill,
  listSkills,
  skillExists,
};
