/**
 * Qwen Code SDK Chimp - Skill Interactive Example
 *
 * Interactive use of Skill SDK, supports multi-turn conversations
 * Usage: npx tsx qwen-code-sdk-chimp/skill-interactive.ts [skill-name]
 */

import * as readline from 'readline';
import * as path from 'path';
import { createSkillRunner, getAvailableSkills, type SkillExecuteResult } from './skill';

// Load skills directory from environment variable or use default
const SKILLS_DIR = path.resolve(process.env.SKILLS_DIR || './skills');

/**
 * Interactive Skill conversation
 */
async function interactiveSkillChat(skillName: string) {
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║           🤖 Skill Interactive Chat                            ║`);
  console.log(`║           Skill: ${skillName.padEnd(45)}║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

  try {
    // Create runner
    const runner = createSkillRunner(SKILLS_DIR, skillName);

    // Create readline interface
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    let isFirstMessage = true;
    let lastResult: SkillExecuteResult | null = null;

    const askQuestion = () => {
      const prompt = lastResult?.needMoreInput
        ? '\n👤 Please provide more information: '
        : '\n👤 Your question: ';

      rl.question(prompt, async (input) => {
        const trimmed = input.trim();

        // Exit command
        if (['quit', 'exit', 'q', 'bye'].includes(trimmed.toLowerCase())) {
          console.log('\n👋 Goodbye!');
          try {
            await runner.end();
          } catch (e) {
            console.error('Error closing session:', e);
          }
          rl.close();
          return;
        }

        // Clear screen
        if (trimmed === 'clear') {
          console.clear();
          askQuestion();
          return;
        }

        // Show history
        if (trimmed === 'history') {
          const history = runner.getHistory();
          console.log('\n--- Conversation History ---');
          history.forEach((msg, i) => {
            const preview = msg.content.substring(0, 60);
            console.log(`${i + 1}. ${msg.role}: ${preview}...`);
          });
          askQuestion();
          return;
        }

        // Empty input
        if (!trimmed) {
          askQuestion();
          return;
        }

        try {
          console.log('\n🤖 AI thinking...\n');

          // Execute
          let responseContent = '';

          const result = await (isFirstMessage
            ? runner.execute(trimmed, {
                stream: true,
                onChunk: (chunk) => {
                  responseContent += chunk;
                  process.stdout.write(chunk);
                },
              })
            : runner.continue(trimmed, {
                stream: true,
                onChunk: (chunk) => {
                  responseContent += chunk;
                  process.stdout.write(chunk);
                },
              }));

          isFirstMessage = false;
          lastResult = result;

          console.log('\n'); // New line

          // Show status
          if (result.status === 'success') {
            console.log('✅ Execution successful');
          } else if (result.status === 'need_more_input') {
            console.log('💬 Need more information');
          } else if (result.status === 'error') {
            console.log('❌ Execution error');
          }

          // Show structured data
          if (result.data) {
            console.log('\n📦 Structured data:');
            console.log(JSON.stringify(result.data, null, 2));
          }

          // Continue asking
          askQuestion();
        } catch (error) {
          console.error('\n❌ Execution failed:', error instanceof Error ? error.message : String(error));
          console.error('Detailed error:', error);
          askQuestion();
        }
      });
    };

    // Start conversation
    askQuestion();
  } catch (error) {
    console.error('❌ Failed to initialize skill runner:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  let skillName = args[0];

  // If no skill specified, list available skills for user to choose
  if (!skillName) {
    try {
      const skills = getAvailableSkills(SKILLS_DIR);

      if (skills.length === 0) {
        console.error('❌ No available skills found');
        console.log(`Please ensure skills directory exists: ${SKILLS_DIR}`);
        process.exit(1);
      }

      if (skills.length === 1) {
        skillName = skills[0];
        console.log(`✅ Auto-selected the only available skill: ${skillName}`);
      } else {
        console.log('Available Skills:');
        skills.forEach((skill, i) => {
          console.log(`  ${i + 1}. ${skill}`);
        });
        
        // If only one argument and it's a number, select corresponding skill
        if (args.length === 1 && !isNaN(parseInt(args[0]))) {
          const skillIndex = parseInt(args[0]) - 1;
          if (skillIndex >= 0 && skillIndex < skills.length) {
            skillName = skills[skillIndex];
            console.log(`✅ Selected skill: ${skillName}`);
          }
        }
        
        if (!skillName) {
          console.log('\nUsage: npx tsx skill-interactive.ts [skill-name]');
          console.log('Or: npx tsx skill-interactive.ts [skill-number]');
          process.exit(0);
        }
      }
    } catch (error) {
      console.error('❌ Error checking available skills:', error);
      process.exit(1);
    }
  }

  // Start interactive conversation
  await interactiveSkillChat(skillName);
}

// Run
main().catch((error) => {
  console.error('❌ Main program error:', error);
  process.exit(1);
});
