import { WebContainer } from '@webcontainer/api';
import { useEffect, useState } from 'react';

interface PreviewFrameProps {
  files: any[];
  webContainer: WebContainer;
}

export function PreviewFrame({ webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState('');

  async function main() {
    // Wait for `server-ready` event
    webContainer.on('server-ready', (port, readyUrl) => {
      console.log(readyUrl);
      console.log(port);
      setUrl(readyUrl);
    });

    const installProcess = await webContainer.spawn('npm', ['install']);

    installProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log(data);
        }
      })
    );
    await installProcess.exit;

    await webContainer.spawn('npm', ['run', 'dev']);
  }

  useEffect(() => {
    main();
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
      {/* Browser Header */}
      <div className="h-11 flex items-center gap-2 px-4 border-b border-slate-800 bg-slate-900">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>

        <div className="ml-4 flex-1 bg-slate-800 rounded-md px-3 py-1 text-xs text-slate-400 truncate">
          {url || 'Starting development server...'}
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 bg-white">
        {!url ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-slate-400">
              <div className="mb-3 h-8 w-8 mx-auto border-2 border-slate-600 border-t-white rounded-full animate-spin" />
              <p>Starting development server...</p>
            </div>
          </div>
        ) : (
          <iframe src={url} title="Preview" className="w-full h-full border-0" />
        )}
      </div>
    </div>
  );
}