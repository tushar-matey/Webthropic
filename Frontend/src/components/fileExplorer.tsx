import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Download, Loader2 } from "lucide-react";
import type { FileItem, FileViewerProps } from "../Types/types";

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";

    case "js":
    case "jsx":
      return "javascript";

    case "json":
      return "json";

    case "html":
      return "html";

    case "css":
      return "css";

    case "md":
      return "markdown";

    case "py":
      return "python";

    case "java":
      return "java";

    case "cpp":
    case "cc":
    case "cxx":
      return "cpp";

    case "c":
      return "c";

    default:
      return "plaintext";
  }
}

export function FileExplorer({
  files,
  onFileSelect,
  onDownload,
  isDownloading
}: {
  files: FileItem[];
  onFileSelect: (file: FileItem) => void;
  onDownload?: () => void;
  isDownloading?: boolean;
}) {
  return (
    <div className="w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 hover:scrollbar-thumb-zinc-600 scrollbar-track-zinc-900 border-r border-zinc-800/80 bg-zinc-900/90 text-white flex flex-col">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between border-b border-zinc-800/60 sticky top-0 bg-zinc-900/95 backdrop-blur-sm z-10">
        <span>Explorer</span>
        {onDownload && (
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition disabled:opacity-50"
            title="Download project (.zip)"
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      <div className="pb-2 flex-1">
        {files.map((file) => (
          <TreeNode
            key={file.path}
            item={file}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
    </div>
  );
}

function TreeNode({
  item,
  onFileSelect,
}: {
  item: FileItem;
  onFileSelect: (file: FileItem) => void;
}) {
  const [open, setOpen] = useState(true);

  if (item.type === "file") {
  return (
    <div
      className="mx-1 flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
      onClick={() => onFileSelect(item)}
    >
      <span className="text-base">📄</span>
      <span className="truncate">{item.name}</span>
    </div>
  );
}

return (
  <div>
    <div
      className="mx-1 flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
      onClick={() => setOpen((prev) => !prev)}
    >
      <span className="w-5">{open ? "📂" : "📁"}</span>
      <span className="truncate">{item.name}</span>
    </div>

    {open && (
      <div className="ml-5 border-l border-zinc-800 pl-2">
        {item.children?.map((child) => (
          <TreeNode
            key={child.path}
            item={child}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
    )}
  </div>
);
}

export function FileViewer({
  file,
}: FileViewerProps) {
  if (!file) {
    return (
      <div className="flex h-full flex-1 items-center justify-center text-gray-500">
        Select a file to view its contents
      </div>
    );
  }

  return (
  <div className="h-full flex flex-col bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">

    {/* File Header */}
    <div className="h-11 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900">
      <span className="text-sm font-medium text-slate-200 truncate">
        {file.path}
      </span>
    </div>

    {/* Monaco Editor */}
    <div className="flex-1">
      <Editor
        theme="vs-dark"
        path={file.path}
        language={getLanguage(file.name)}
        value={file.content ?? ""}
        height="100%"
        options={{
          readOnly: true,
          minimap: {
            enabled: false,
          },
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: "JetBrains Mono, Fira Code, monospace",
          wordWrap: "on",
          lineNumbers: "on",
          folding: true,
          automaticLayout: true,
          padding: {
            top: 16,
          },
          renderLineHighlight: "gutter",
          smoothScrolling: true,
        }}
      />
    </div>
  </div>
);
}