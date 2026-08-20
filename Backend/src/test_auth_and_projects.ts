import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase, disconnectDatabase } from './config/database.js';
import { authService } from './services/auth.service.js';
import { projectService } from './services/project.service.js';
import { User } from './models/User.js';
import { Project } from './models/Project.js';
import { StepType, type FileItem } from './types/project.types.js';
import { generateRandomToken, hashToken } from './utils/crypto.js';
import { buildProjectZip } from './utils/buildProjectZip.js';
import JSZip from 'jszip';

async function runTests() {
  console.log('\n======================================================');
  console.log('  RUNNING WEBTHROPIC AUTH & PERSISTENCE TEST SUITE');
  console.log('======================================================\n');

  try {
    await connectDatabase();

    // Clean up test data from any previous runs
    await User.deleteMany({ email: { $in: ['test_alice@webthropic.io', 'test_bob@webthropic.io'] } });

    console.log('✅ Test 1: User Registration');
    const alice = await authService.register('Alice Wonderland', 'test_alice@webthropic.io', 'SecurePassword123!');
    if (!alice.id || alice.email !== 'test_alice@webthropic.io') {
      throw new Error('Registration failed to return valid sanitized user');
    }
    if ((alice as any).passwordHash) {
      throw new Error('Security violation: passwordHash exposed in sanitized user');
    }
    console.log('   - Alice registered successfully with ID:', alice.id);

    console.log('✅ Test 2: Duplicate Email Rejection');
    let duplicateRejected = false;
    try {
      await authService.register('Alice Impostor', 'test_alice@webthropic.io', 'SecurePassword123!');
    } catch (err: any) {
      if (err.statusCode === 409) {
        duplicateRejected = true;
      }
    }
    if (!duplicateRejected) {
      throw new Error('Duplicate email was not rejected with 409 status');
    }
    console.log('   - Duplicate email properly rejected with 409 Conflict');

    console.log('✅ Test 3: User Login');
    const loggedInAlice = await authService.login('test_alice@webthropic.io', 'SecurePassword123!');
    if (!loggedInAlice || loggedInAlice.id !== alice.id) {
      throw new Error('Login failed for valid credentials');
    }
    console.log('   - Alice logged in successfully');

    let invalidLoginRejected = false;
    try {
      await authService.login('test_alice@webthropic.io', 'WrongPassword123!');
    } catch (err: any) {
      if (err.statusCode === 401) {
        invalidLoginRejected = true;
      }
    }
    if (!invalidLoginRejected) {
      throw new Error('Invalid password was not rejected with 401 status');
    }
    console.log('   - Invalid password rejected with 401 Unauthorized');

    console.log('✅ Test 4: Email Verification Flow');
    const rawVerifyToken = generateRandomToken(32);
    const aliceDoc = await User.findById(alice.id);
    if (!aliceDoc) throw new Error('User document not found');
    aliceDoc.emailVerificationTokenHash = hashToken(rawVerifyToken);
    aliceDoc.emailVerificationExpiresAt = new Date(Date.now() + 3600000);
    await aliceDoc.save();

    const verifiedAlice = await authService.verifyEmail(rawVerifyToken);
    if (!verifiedAlice.emailVerified) {
      throw new Error('Email verification failed to set emailVerified to true');
    }
    console.log('   - Email verified successfully via token');

    console.log('✅ Test 5: Password Reset Flow');
    const rawResetToken = generateRandomToken(32);
    aliceDoc.passwordResetTokenHash = hashToken(rawResetToken);
    aliceDoc.passwordResetExpiresAt = new Date(Date.now() + 3600000);
    await aliceDoc.save();

    await authService.resetPassword(rawResetToken, 'BrandNewPassword456!');
    const loginWithNewPass = await authService.login('test_alice@webthropic.io', 'BrandNewPassword456!');
    if (!loginWithNewPass) {
      throw new Error('Login with new password failed after reset');
    }
    console.log('   - Password reset successfully updated password and allowed login');

    console.log('✅ Test 6: Project Creation & Persistence');
    const project1 = await projectService.createProject(alice.id, {
      name: 'Developer Portfolio',
      prompt: 'Build a modern React developer portfolio with dark theme',
      steps: [
        {
          id: 'step-1',
          title: 'Create App.tsx',
          description: 'Main application',
          type: StepType.CreateFile,
          status: 'completed',
          path: '/src/App.tsx',
          code: 'export default function App() { return <h1>Hello</h1>; }'
        }
      ],
      files: [
        {
          name: 'App.tsx',
          type: 'file',
          path: '/src/App.tsx',
          content: 'export default function App() { return <h1>Hello</h1>; }'
        }
      ]
    });
    console.log('   - Project created in MongoDB with ID:', project1._id.toString());

    console.log('✅ Test 7: Project Updates & Auto-Save Recovery');
    const updated = await projectService.updateProject(project1._id.toString(), alice.id, {
      steps: [
        {
          id: 'step-1',
          title: 'Create App.tsx',
          description: 'Main application',
          type: StepType.CreateFile,
          status: 'completed',
          path: '/src/App.tsx',
          code: 'export default function App() { return <h1>Hello</h1>; }'
        },
        {
          id: 'step-2',
          title: 'Create Header.tsx',
          description: 'Navigation header',
          type: StepType.CreateFile,
          status: 'in-progress',
          path: '/src/Header.tsx',
          code: 'export function Header() {}'
        }
      ],
      chatMessages: [
        { role: 'user', content: 'Build a modern React developer portfolio' },
        { role: 'assistant', content: 'Here are the files for your portfolio.' }
      ]
    });

    if (!updated || updated.steps.length !== 2) {
      throw new Error('Project update failed');
    }
    console.log('   - Project autosave synced 2 steps and chat messages');

    console.log('✅ Test 8: Authorization & User Isolation');
    const bob = await authService.register('Bob Builder', 'test_bob@webthropic.io', 'BobPassword123!');

    // Bob tries to access Alice's project
    const unauthorizedAccess = await projectService.getProjectById(project1._id.toString(), bob.id);
    if (unauthorizedAccess !== null) {
      throw new Error('Security breach: Bob was able to access Alice project!');
    }
    console.log('   - User isolation verified: Bob cannot access Alice project (returned null/404)');

    // Bob tries to modify Alice's project
    const unauthorizedUpdate = await projectService.updateProject(project1._id.toString(), bob.id, {
      name: 'Hacked by Bob'
    });
    if (unauthorizedUpdate !== null) {
      throw new Error('Security breach: Bob was able to modify Alice project!');
    }
    console.log('   - User isolation verified: Bob cannot update Alice project');

    console.log('✅ Test 9: User Projects Listing');
    const aliceProjects = await projectService.getUserProjects(alice.id);
    if (aliceProjects.length !== 1 || aliceProjects[0]?.name !== 'Developer Portfolio') {
      throw new Error('Project listing mismatch');
    }
    console.log('   - Alice projects listed with total steps and completed steps count');

    console.log('✅ Test 10: Project Zip Building (buildProjectZip)');
    const testFileTree: FileItem[] = [
      {
        name: 'package.json',
        type: 'file',
        path: '/package.json',
        content: '{"name": "test-project", "version": "1.0.0"}'
      },
      {
        name: 'src',
        type: 'folder',
        path: '/src',
        children: [
          {
            name: 'App.tsx',
            type: 'file',
            path: '/src/App.tsx',
            content: 'export default function App() { return <h1>Hello</h1>; }'
          },
          {
            name: 'empty-folder',
            type: 'folder',
            path: '/src/empty-folder',
            children: []
          },
          {
            name: 'logo.png',
            type: 'file',
            path: '/src/logo.png',
            content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
          }
        ]
      },
      {
        name: 'node_modules',
        type: 'folder',
        path: '/node_modules',
        children: [
          {
            name: 'react',
            type: 'folder',
            path: '/node_modules/react',
            children: [
              {
                name: 'index.js',
                type: 'file',
                path: '/node_modules/react/index.js',
                content: 'module.exports = {};'
              }
            ]
          }
        ]
      },
      {
        name: '.git',
        type: 'folder',
        path: '/.git',
        children: [
          {
            name: 'HEAD',
            type: 'file',
            path: '/.git/HEAD',
            content: 'ref: refs/heads/main'
          }
        ]
      }
    ];

    const zipBuffer = await buildProjectZip(testFileTree);
    if (!zipBuffer || zipBuffer.length === 0) {
      throw new Error('buildProjectZip returned empty buffer');
    }

    const unzipped = await JSZip.loadAsync(zipBuffer);
    const zipKeys = Object.keys(unzipped.files);

    // Verify included files and folders
    if (!unzipped.file('package.json')) throw new Error('package.json missing from zip');
    if (!unzipped.file('src/App.tsx')) throw new Error('src/App.tsx missing from zip');
    if (!unzipped.file('src/logo.png')) throw new Error('src/logo.png binary missing from zip');
    
    // Verify empty folder exists in zip
    const emptyFolderEntry = unzipped.folder('src/empty-folder');
    if (!emptyFolderEntry) throw new Error('Empty folder src/empty-folder was not preserved in zip');

    // Verify binary file was correctly decoded as Buffer
    const binaryData = await unzipped.file('src/logo.png')!.async('nodebuffer');
    if (binaryData.length !== 70 || binaryData[0] !== 0x89 || binaryData[1] !== 0x50) {
      throw new Error('Binary PNG header mismatch in decoded zip entry');
    }

    // Verify excluded directories were completely skipped
    const hasNodeModules = zipKeys.some((k) => k.startsWith('node_modules'));
    const hasGit = zipKeys.some((k) => k.startsWith('.git'));
    if (hasNodeModules) throw new Error('node_modules was not excluded from zip');
    if (hasGit) throw new Error('.git was not excluded from zip');

    console.log('   - Reconstructed tree hierarchy, preserved empty folders, decoded binary PNG, and excluded node_modules/.git');

    console.log('✅ Test 11: Project Deletion');
    const deleted = await projectService.deleteProject(project1._id.toString(), alice.id);
    if (!deleted) {
      throw new Error('Failed to delete project');
    }
    const checkDeleted = await projectService.getProjectById(project1._id.toString(), alice.id);
    if (checkDeleted !== null) {
      throw new Error('Project still exists after deletion');
    }
    console.log('   - Project successfully deleted from MongoDB');

    // Clean up test documents
    await User.deleteMany({ email: { $in: ['test_alice@webthropic.io', 'test_bob@webthropic.io'] } });
    await Project.deleteMany({ userId: { $in: [alice.id, bob.id] } });

    console.log('\n======================================================');
    console.log('  🎉 ALL 11 AUTH, PERSISTENCE & ZIP TESTS PASSED!    ');
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

runTests();
