import JSZip from 'jszip';
import { buildProjectZip, isExcluded, sanitizeZipPath, DEFAULT_EXCLUDED_PATTERNS } from './utils/buildProjectZip.js';
import type { FileItem } from './types/project.types.js';

async function runZipUnitTests() {
  console.log('\n======================================================');
  console.log('   RUNNING BUILD PROJECT ZIP UNIT TEST SUITE');
  console.log('======================================================\n');

  try {
    console.log('✅ Unit Test 1: Path sanitization');
    if (sanitizeZipPath('/src/components/App.tsx') !== 'src/components/App.tsx') {
      throw new Error(`Sanitization failed: ${sanitizeZipPath('/src/components/App.tsx')}`);
    }
    if (sanitizeZipPath('../../../etc/passwd') !== 'etc/passwd') {
      throw new Error(`Path traversal sanitization failed: ${sanitizeZipPath('../../../etc/passwd')}`);
    }
    if (sanitizeZipPath('nested\\folder\\file.js') !== 'nested/folder/file.js') {
      throw new Error(`Backslash sanitization failed: ${sanitizeZipPath('nested\\folder\\file.js')}`);
    }
    console.log('   - Path sanitization correctly normalizes paths and prevents directory traversal');

    console.log('✅ Unit Test 2: Exclusion filtering at walk level');
    if (!isExcluded('node_modules', 'node_modules', DEFAULT_EXCLUDED_PATTERNS)) {
      throw new Error('node_modules was not recognized as excluded');
    }
    if (!isExcluded('.git', '.git', DEFAULT_EXCLUDED_PATTERNS)) {
      throw new Error('.git was not recognized as excluded');
    }
    if (!isExcluded('.next', '.next', DEFAULT_EXCLUDED_PATTERNS)) {
      throw new Error('.next was not recognized as excluded');
    }
    if (!isExcluded('dist', 'dist', DEFAULT_EXCLUDED_PATTERNS)) {
      throw new Error('dist was not recognized as excluded');
    }
    if (!isExcluded('build', 'build', DEFAULT_EXCLUDED_PATTERNS)) {
      throw new Error('build was not recognized as excluded');
    }
    if (isExcluded('src', 'src', DEFAULT_EXCLUDED_PATTERNS)) {
      throw new Error('src was incorrectly marked as excluded');
    }
    console.log('   - Exclusion filter correctly matches node_modules, .git, .next, dist, build');

    console.log('✅ Unit Test 3: Building zip with nested files, empty folders, binaries & exclusions');
    const sampleTree: FileItem[] = [
      {
        name: 'package.json',
        type: 'file',
        path: '/package.json',
        content: JSON.stringify({ name: 'my-web-app', version: '1.0.0' }, null, 2)
      },
      {
        name: 'public',
        type: 'folder',
        path: '/public',
        children: [
          {
            name: 'favicon.ico',
            type: 'file',
            path: '/public/favicon.ico',
            content: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
          },
          {
            name: 'empty-assets',
            type: 'folder',
            path: '/public/empty-assets',
            children: []
          }
        ]
      },
      {
        name: 'src',
        type: 'folder',
        path: '/src',
        children: [
          {
            name: 'index.css',
            type: 'file',
            path: '/src/index.css',
            content: 'body { margin: 0; background: #000; }'
          },
          {
            name: 'App.tsx',
            type: 'file',
            path: '/src/App.tsx',
            content: 'export default function App() { return <div>Hello Webthropic</div>; }'
          }
        ]
      },
      {
        name: 'node_modules',
        type: 'folder',
        path: '/node_modules',
        children: [
          {
            name: 'huge-dependency',
            type: 'folder',
            path: '/node_modules/huge-dependency',
            children: [
              {
                name: 'index.js',
                type: 'file',
                path: '/node_modules/huge-dependency/index.js',
                content: 'console.log("should be skipped");'
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
            name: 'config',
            type: 'file',
            path: '/.git/config',
            content: '[core]\n\trepositoryformatversion = 0'
          }
        ]
      },
      {
        name: 'dist',
        type: 'folder',
        path: '/dist',
        children: [
          {
            name: 'bundle.js',
            type: 'file',
            path: '/dist/bundle.js',
            content: '/* compiled */'
          }
        ]
      }
    ];

    const zipBuffer = await buildProjectZip(sampleTree);
    if (!zipBuffer || !(zipBuffer instanceof Buffer)) {
      throw new Error('buildProjectZip did not return a valid Buffer');
    }

    const zip = await JSZip.loadAsync(zipBuffer);
    const filesInZip = Object.keys(zip.files);

    // Verify presence of project files
    if (!zip.file('package.json')) throw new Error('package.json missing from zip');
    if (!zip.file('src/index.css')) throw new Error('src/index.css missing from zip');
    if (!zip.file('src/App.tsx')) throw new Error('src/App.tsx missing from zip');
    if (!zip.file('public/favicon.ico')) throw new Error('public/favicon.ico missing from zip');

    // Verify empty folder preservation
    const emptyFolder = zip.folder('public/empty-assets');
    if (!emptyFolder) throw new Error('Empty folder public/empty-assets was not preserved in zip');

    // Verify binary content
    const faviconBuffer = await zip.file('public/favicon.ico')!.async('nodebuffer');
    if (!Buffer.isBuffer(faviconBuffer) || faviconBuffer.length === 0) {
      throw new Error('Binary favicon was not correctly stored as Buffer');
    }

    // Verify exclusions
    const hasNodeModules = filesInZip.some((f) => f.includes('node_modules'));
    const hasGit = filesInZip.some((f) => f.includes('.git'));
    const hasDist = filesInZip.some((f) => f.includes('dist'));

    if (hasNodeModules) throw new Error('node_modules found in zip archive!');
    if (hasGit) throw new Error('.git found in zip archive!');
    if (hasDist) throw new Error('dist found in zip archive!');

    console.log('   - Generated valid zip with preserved folder hierarchy, empty folders, and decoded binaries');
    console.log('   - Skipped node_modules, .git, and dist entirely');

    console.log('✅ Unit Test 4: Safety limit enforcement (depth)');
    let depthFailed = false;
    try {
      await buildProjectZip(sampleTree, { maxDepth: 0 });
    } catch (err: any) {
      if (err.message.includes('depth')) depthFailed = true;
    }
    if (!depthFailed) {
      throw new Error('Depth limit was not enforced');
    }
    console.log('   - Maximum depth limit successfully prevented deep nesting abuse');

    console.log('✅ Unit Test 5: Safety limit enforcement (size)');
    let sizeFailed = false;
    try {
      await buildProjectZip(sampleTree, { maxSizeBytes: 10 });
    } catch (err: any) {
      if (err.message.includes('size')) sizeFailed = true;
    }
    if (!sizeFailed) {
      throw new Error('Size limit was not enforced');
    }
    console.log('   - Maximum payload size limit successfully enforced');

    console.log('\n======================================================');
    console.log('   🎉 ALL 5 ZIP UTILITY TESTS PASSED SUCCESSFULLY!    ');
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n❌ Zip unit test failed:', error);
    process.exit(1);
  }
}

runZipUnitTests();
