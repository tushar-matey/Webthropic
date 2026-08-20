import { useState, useCallback } from 'react';
import { api } from '../lib/api.js';

interface UseProjectDownloadReturn {
  isDownloading: boolean;
  downloadingProjectId: string | null;
  error: string | null;
  clearError: () => void;
  downloadProject: (projectId: string, fallbackName?: string) => Promise<boolean>;
}

/**
 * Custom hook to safely handle authenticated project zip downloads
 * with loading states, error extraction, and browser file streaming.
 */
export function useProjectDownload(): UseProjectDownloadReturn {
  const [downloadingProjectId, setDownloadingProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const downloadProject = useCallback(
    async (projectId: string, fallbackName: string = 'project'): Promise<boolean> => {
      if (!projectId) {
        setError('Project ID is required to download');
        return false;
      }

      setDownloadingProjectId(projectId);
      setError(null);

      try {
        const response = await api.get(`/api/projects/${projectId}/download`, {
          responseType: 'blob'
        });

        // Extract filename from Content-Disposition header if available
        let filename = `${fallbackName.replace(/[/\\?%*:|"<>]/g, '_')}.zip`;
        const disposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];

        if (disposition && typeof disposition === 'string') {
          const utf8FilenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
          const simpleFilenameMatch = disposition.match(/filename="?([^";]+)"?/i);

          if (utf8FilenameMatch && utf8FilenameMatch[1]) {
            filename = decodeURIComponent(utf8FilenameMatch[1]);
          } else if (simpleFilenameMatch && simpleFilenameMatch[1]) {
            filename = simpleFilenameMatch[1];
          }
        }

        // Ensure extension ends with .zip
        if (!filename.endsWith('.zip')) {
          filename += '.zip';
        }

        // Create a blob URL and trigger browser download
        const blob = new Blob([response.data], { type: 'application/zip' });
        const downloadUrl = window.URL.createObjectURL(blob);

        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        // Revoke the blob URL after download is triggered
        setTimeout(() => {
          window.URL.revokeObjectURL(downloadUrl);
        }, 1000);

        return true;
      } catch (err: any) {
        console.error('Project download failed:', err);

        let message = 'Failed to download project zip';

        // If the error response is a Blob containing JSON error from server
        if (err.response?.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const parsed = JSON.parse(text);
            if (parsed.message) {
              message = parsed.message;
            }
          } catch {
            // Keep default message if parsing fails
          }
        } else if (err.message) {
          message = err.message;
        }

        setError(message);
        return false;
      } finally {
        setDownloadingProjectId(null);
      }
    },
    []
  );

  return {
    isDownloading: downloadingProjectId !== null,
    downloadingProjectId,
    error,
    clearError,
    downloadProject
  };
}
