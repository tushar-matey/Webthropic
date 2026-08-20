import JSZip from 'jszip';
import type { FileItem } from '../types/project.types.js';

export interface BuildZipOptions {
  /**
   * List of exact file/directory names or regex patterns to skip during tree traversal.
   * Excluded directories are skipped immediately without recursing into their children.
   */
  exclude?: (string | RegExp)[];
  /**
   * Maximum folder nesting depth allowed. Default is 30.
   */
  maxDepth?: number;
  /**
   * Maximum number of files permitted in the zip archive. Default is 5000.
   */
  maxFiles?: number;
  /**
   * Maximum total uncompressed payload size in bytes. Default is 100MB.
   */
  maxSizeBytes?: number;
}

/**
 * Default patterns to ignore when building a project zip.
 * Skipped at the walk level to prevent wasted recursion and huge zip files.
 */
export const DEFAULT_EXCLUDED_PATTERNS: (string | RegExp)[] = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.turbo',
  '.cache',
  '.output',
  '.nuxt',
  '.DS_Store',
  'Thumbs.db',
  '.env.local'
];

/**
 * Checks if a given item name or relative path matches any exclusion pattern.
 */
export function isExcluded(name: string, relativePath: string, patterns: (string | RegExp)[]): boolean {
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const pathSegments = normalizedPath.split('/').filter(Boolean);

  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      if (name === pattern || pathSegments.includes(pattern) || normalizedPath === pattern) {
        return true;
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(name) || pattern.test(normalizedPath)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Normalizes and sanitizes a file or folder path for zip entry:
 * - Converts backslashes to forward slashes
 * - Strips leading/trailing slashes and current-directory prefixes (./)
 * - Prevents path traversal vulnerabilities (..)
 */
export function sanitizeZipPath(rawPath: string): string {
  if (!rawPath) return '';

  const normalized = rawPath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  const segments = normalized.split('/').filter(Boolean);
  const safeSegments: string[] = [];

  for (const seg of segments) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') {
      // Disallow ascending beyond root
      if (safeSegments.length > 0) {
        safeSegments.pop();
      }
    } else {
      safeSegments.push(seg);
    }
  }

  return safeSegments.join('/');
}

/**
 * Checks if a content string is a Base64 data URL or encoded binary data,
 * and decodes it to a Buffer if so.
 */
export function parseContentData(content: string | undefined | null): { data: string | Buffer; isBinary: boolean } {
  if (content === undefined || content === null) {
    return { data: '', isBinary: false };
  }

  if (typeof content !== 'string') {
    return { data: Buffer.from(content as any), isBinary: true };
  }

  // Check for Base64 Data URL (e.g. data:image/png;base64,iVBORw0KGgo...)
  const dataUrlMatch = content.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+)?;base64,(.+)$/s);
  if (dataUrlMatch && dataUrlMatch[2]) {
    try {
      const buffer = Buffer.from(dataUrlMatch[2], 'base64');
      return { data: buffer, isBinary: true };
    } catch {
      // Fallback to text if decoding fails
      return { data: content, isBinary: false };
    }
  }

  return { data: content, isBinary: false };
}

/**
 * Reconstructs a full folder/file hierarchy from a MongoDB project FileItem tree
 * into a compressed .zip Buffer using JSZip.
 */
export async function buildProjectZip(
  files: FileItem[],
  options: BuildZipOptions = {}
): Promise<Buffer> {
  const exclude = options.exclude ?? DEFAULT_EXCLUDED_PATTERNS;
  const maxDepth = options.maxDepth ?? 30;
  const maxFiles = options.maxFiles ?? 5000;
  const maxSizeBytes = options.maxSizeBytes ?? 100 * 1024 * 1024; // 100 MB

  const zip = new JSZip();
  let totalFiles = 0;
  let totalBytes = 0;

  function walk(items: FileItem[], currentPathPrefix: string, depth: number): void {
    if (depth > maxDepth) {
      throw new Error(`Project folder nesting exceeds maximum allowable depth (${maxDepth})`);
    }

    for (const item of items) {
      if (!item || !item.name) continue;

      const itemName = item.name.trim();
      const rawPath = item.path || (currentPathPrefix ? `${currentPathPrefix}/${itemName}` : itemName);
      const cleanPath = sanitizeZipPath(rawPath);

      // Check exclusions at current level. If excluded, skip node immediately
      // (avoiding descending into subtrees like node_modules or .git)
      if (isExcluded(itemName, cleanPath, exclude)) {
        continue;
      }

      if (item.type === 'folder') {
        const hasChildren = Array.isArray(item.children) && item.children.length > 0;

        if (!hasChildren) {
          // Explicitly create empty folder entry in the zip
          if (cleanPath) {
            zip.folder(cleanPath);
          }
        } else {
          // Recurse into children
          walk(item.children!, cleanPath, depth + 1);
        }
      } else if (item.type === 'file') {
        totalFiles += 1;
        if (totalFiles > maxFiles) {
          throw new Error(`Project exceeds maximum file count limit of ${maxFiles} files`);
        }

        const { data, isBinary } = parseContentData(item.content);
        const byteLength = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8');

        totalBytes += byteLength;
        if (totalBytes > maxSizeBytes) {
          throw new Error(
            `Project uncompressed size exceeds maximum safety limit (${Math.round(maxSizeBytes / (1024 * 1024))}MB)`
          );
        }

        if (cleanPath) {
          zip.file(cleanPath, data, { binary: isBinary });
        }
      }
    }
  }

  walk(files, '', 0);

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6
    }
  });

  return zipBuffer;
}
