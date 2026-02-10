#!/usr/bin/env node

/**
 * Auto PR Creation Script
 * Automatic Pull Request creation script
 *
 * Features:
 * - Push current branch to remote
 * - Create PR using GitHub CLI
 * - Support bilingual (Chinese/English) descriptions
 *
 * Usage:
 * node create-pr.js --title "PR Title" --body-file ./PR_DESCRIPTION.md --base main
 */

const { execSync } = require('child_process');
const fs = require('fs');

/**
 * Execute shell command and return result
 * @param {string} command - Command to execute
 * @param {object} options - Execution options
 * @returns {string} Command output
 */
function execCommand(command, options = {}) {
    try {
        const result = execSync(command, {
            encoding: 'utf-8',
            stdio: options.silent ? 'pipe' : 'inherit',
            ...options
        });
        return result ? result.trim() : '';
    } catch (error) {
        if (options.ignoreError) {
            return '';
        }
        throw error;
    }
}

/**
 * Get current branch name
 * @returns {string} Branch name
 */
function getCurrentBranch() {
    return execCommand('git branch --show-current', { silent: true });
}

/**
 * Check if there are uncommitted changes
 * @returns {boolean} Whether there are uncommitted changes
 */
function hasUncommittedChanges() {
    const status = execCommand('git status --porcelain', { silent: true });
    return status.length > 0;
}

/**
 * Check if GitHub CLI is installed
 * @returns {boolean} Whether installed
 */
function isGhCliInstalled() {
    try {
        execCommand('gh --version', { silent: true });
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if GitHub CLI is authenticated
 * @returns {boolean} Whether authenticated
 */
function isGhCliAuthenticated() {
    try {
        execCommand('gh auth status', { silent: true });
        return true;
    } catch {
        return false;
    }
}

/**
 * Push current branch to remote
 * @param {string} branch - Branch name
 */
function pushBranch(branch) {
    console.log(`\n📤 Pushing branch ${branch} to remote...`);
    execCommand(`git push -u origin ${branch}`);
    console.log('✅ Push successful');
}

/**
 * Create Pull Request
 * @param {object} options - PR options
 * @returns {string} PR URL
 */
function createPullRequest(options) {
    const { title, body, bodyFile, base, draft, reviewers, labels } = options;

    let command = 'gh pr create';
    command += ` --title "${title}"`;
    command += ` --base ${base}`;

    if (bodyFile && fs.existsSync(bodyFile)) {
        command += ` --body-file "${bodyFile}"`;
    } else if (body) {
        command += ` --body "${body}"`;
    }

    if (draft) {
        command += ' --draft';
    }

    if (reviewers && reviewers.length > 0) {
        command += ` --reviewer ${reviewers.join(',')}`;
    }

    if (labels && labels.length > 0) {
        command += ` --label ${labels.join(',')}`;
    }

    console.log('\n🚀 Creating Pull Request...');
    const prUrl = execCommand(command, { silent: true });
    return prUrl;
}

/**
 * Parse command line arguments
 * @returns {object} Parsed arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        title: '',
        body: '',
        bodyFile: '',
        base: 'main',
        draft: false,
        reviewers: [],
        labels: [],
        push: true
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--title':
            case '-t':
                options.title = args[++i];
                break;
            case '--body':
            case '-b':
                options.body = args[++i];
                break;
            case '--body-file':
            case '-f':
                options.bodyFile = args[++i];
                break;
            case '--base':
                options.base = args[++i];
                break;
            case '--draft':
            case '-d':
                options.draft = true;
                break;
            case '--reviewer':
            case '-r':
                options.reviewers.push(args[++i]);
                break;
            case '--label':
            case '-l':
                options.labels.push(args[++i]);
                break;
            case '--no-push':
                options.push = false;
                break;
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
        }
    }

    return options;
}

/**
 * Print help information
 */
function printHelp() {
    console.log(`
Auto PR Creation Script - Automatic Pull Request Creation

Usage:
  node create-pr.js [options]

Options:
  -t, --title <title>       PR title (required)
  -b, --body <body>         PR description content
  -f, --body-file <file>    PR description file path
  --base <branch>           Target branch (default: main)
  -d, --draft               Create as draft PR
  -r, --reviewer <user>     Add reviewer (can be used multiple times)
  -l, --label <label>       Add label (can be used multiple times)
  --no-push                 Don't push branch automatically
  -h, --help                Show help information

Examples:
  node create-pr.js -t "feat: add new feature" -f ./PR_DESCRIPTION.md
  node create-pr.js -t "fix: fix bug" --base develop -d
  node create-pr.js -t "chore: update dependencies" -r user1 -r user2 -l enhancement
`);
}

/**
 * Main function
 */
async function main() {
    console.log('🔧 Auto PR Creation Script\n');

    // Parse arguments
    const options = parseArgs();

    // Validate required parameters
    if (!options.title) {
        console.error('❌ Error: Please provide PR title (--title)');
        process.exit(1);
    }

    // Check GitHub CLI
    if (!isGhCliInstalled()) {
        console.error('❌ Error: GitHub CLI (gh) not installed');
        console.error('   Please visit https://cli.github.com/ to install');
        process.exit(1);
    }

    if (!isGhCliAuthenticated()) {
        console.error('❌ Error: GitHub CLI not authenticated');
        console.error('   Please run `gh auth login` to authenticate');
        process.exit(1);
    }

    // Get current branch
    const currentBranch = getCurrentBranch();
    console.log(`📌 Current branch: ${currentBranch}`);

    // Check if on main branch
    if (currentBranch === 'main' || currentBranch === 'master') {
        console.error('❌ Error: Cannot create PR on main branch');
        process.exit(1);
    }

    // Check uncommitted changes
    if (hasUncommittedChanges()) {
        console.error('❌ Error: Uncommitted changes exist, please commit first');
        process.exit(1);
    }

    // Push branch
    if (options.push) {
        pushBranch(currentBranch);
    }

    // Create PR
    try {
        const prUrl = createPullRequest(options);
        console.log('\n✅ PR created successfully!');
        console.log(`🔗 ${prUrl}`);
    } catch (error) {
        console.error('\n❌ PR creation failed:', error.message);
        process.exit(1);
    }
}

// Execute main function
main().catch(console.error);
