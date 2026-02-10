#!/usr/bin/env node

/**
 * Prerequisites Check Script
 * Check dependencies and configurations required by auto-pr skill
 */

const { execSync } = require('child_process');

/**
 * Execute command and return result
 * @param {string} command - Command
 * @returns {string|null} Output or null
 */
function exec(command) {
    try {
        return execSync(command, { encoding: 'utf-8', stdio: 'pipe' }).trim();
    } catch {
        return null;
    }
}

/**
 * Check if gh CLI is installed
 * @returns {object} Check result
 */
function checkGhCli() {
    const version = exec('gh --version');
    if (version) {
        const match = version.match(/gh version ([\d.]+)/);
        return {
            installed: true,
            version: match ? match[1] : 'unknown'
        };
    }
    return { installed: false };
}

/**
 * Check gh CLI authentication status
 * @returns {object} Authentication result
 */
function checkGhAuth() {
    const status = exec('gh auth status 2>&1');
    if (status && status.includes('Logged in')) {
        const userMatch = status.match(/account (\S+)/);
        return {
            authenticated: true,
            user: userMatch ? userMatch[1] : 'unknown'
        };
    }
    return { authenticated: false };
}

/**
 * Check Git configuration
 * @returns {object} Git configuration
 */
function checkGit() {
    const version = exec('git --version');
    const user = exec('git config user.name');
    const email = exec('git config user.email');

    return {
        installed: !!version,
        version: version ? version.replace('git version ', '') : null,
        user,
        email
    };
}

/**
 * Get installation guide
 * @returns {string} Installation guide
 */
function getInstallGuide() {
    const platform = process.platform;

    let guide = '\n📦 GitHub CLI Installation Guide:\n';

    if (platform === 'darwin') {
        guide += '   brew install gh\n';
    } else if (platform === 'win32') {
        guide += '   winget install --id GitHub.cli\n';
        guide += '   # or\n';
        guide += '   choco install gh\n';
    } else {
        guide += '   # Ubuntu/Debian:\n';
        guide += '   sudo apt install gh\n';
        guide += '   # or visit: https://cli.github.com/\n';
    }

    guide += '\n🔐 Authentication Guide:\n';
    guide += '   gh auth login\n';
    guide += '   # Follow prompts to complete GitHub account authentication\n';

    return guide;
}

/**
 * Main function
 */
function main() {
    console.log('🔍 Auto PR - Prerequisites Check\n');
    console.log('='.repeat(40));

    let allPassed = true;

    // Check Git
    console.log('\n📌 Git Check:');
    const git = checkGit();
    if (git.installed) {
        console.log(`   ✅ Installed (${git.version})`);
        console.log(`   👤 User: ${git.user || 'Not configured'}`);
        console.log(`   📧 Email: ${git.email || 'Not configured'}`);
    } else {
        console.log('   ❌ Not installed');
        allPassed = false;
    }

    // Check gh CLI
    console.log('\n📌 GitHub CLI Check:');
    const gh = checkGhCli();
    if (gh.installed) {
        console.log(`   ✅ Installed (v${gh.version})`);
    } else {
        console.log('   ❌ Not installed');
        allPassed = false;
    }

    // Check authentication
    console.log('\n📌 GitHub Authentication Check:');
    if (gh.installed) {
        const auth = checkGhAuth();
        if (auth.authenticated) {
            console.log(`   ✅ Authenticated (${auth.user})`);
        } else {
            console.log('   ❌ Not authenticated');
            allPassed = false;
        }
    } else {
        console.log('   ⏭️  Skipped (need to install gh first)');
    }

    // Result summary
    console.log('\n' + '='.repeat(40));
    if (allPassed) {
        console.log('✅ All checks passed, ready to use auto-pr skill');
    } else {
        console.log('❌ Some checks failed');
        console.log(getInstallGuide());
    }

    process.exit(allPassed ? 0 : 1);
}

main();
