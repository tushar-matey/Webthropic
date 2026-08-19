import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { type FileItem, type Step, StepType, type FullProject } from '../Types/types.js';
import { parseXml } from '../steps.js';
import { useWebContainer } from '../hooks/useWebContainer.js';
import { useDebouncedCallback } from '../hooks/useDebounce.js';
import { UserMenu } from '../components/UserMenu.js';

// Components
import StepsList from '../components/stepsComponent.js';
import { FileExplorer, FileViewer } from '../components/fileExplorer.js';
import { PreviewFrame } from '../components/Preview.js';
import TabView from '../components/Tabview.js';

// Default templates
import { responce_paint } from '../config.js';

// Icons
import {
  Sparkles,
  Send,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Maximize2,
  Minimize2
} from 'lucide-react';

export function Builder() {
  const location = useLocation();
  const params = useParams<{ projectId?: string }>();

  const [projectId, setProjectId] = useState<string | null>(params.projectId || null);
  const [projectName, setProjectName] = useState<string>('Webthropic Project');
  const [initialPrompt, setInitialPrompt] = useState<string>(
    (location.state as any)?.userPromt || ''
  );

  const [steps, setSteps] = useState<Step[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);

  // WebContainer instance
  const webcontainer = useWebContainer();

  // Follow-up chat prompt & conversation history
  const [followupPrompt, setFollowupPrompt] = useState<string>('');
  const [llmMessages, setLlmMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>(
    []
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewFullscreen, setPreviewFullscreen] = useState<boolean>(false);

  // Persistence & Save status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [hasInterruptedSteps, setHasInterruptedSteps] = useState<boolean>(false);

  // Reference to avoid initial mount autosave overwrites
  const isFirstRender = useRef(true);

  // Helper to find a file by path in the file tree
  const findFileByPath = (items: FileItem[], path: string): FileItem | null => {
    for (const item of items) {
      if (item.path === path) return item;
      if (item.children) {
        const found = findFileByPath(item.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  // -------------------------------------------------------------
  // 1. Load project from MongoDB if projectId is present
  // -------------------------------------------------------------
  useEffect(() => {
    async function loadProject() {
      if (!projectId) {
        setIsInitialized(true);
        return;
      }

      try {
        const res = await api.get<{ success: boolean; data: FullProject }>(
          `/api/projects/${projectId}`
        );
        const project = res.data.data;

        if (project) {
          setProjectName(project.name || 'Untitled Project');
          setInitialPrompt(project.prompt || '');
          setFiles(project.files || []);
          setLlmMessages(project.chatMessages || []);

          // Process steps and check for interrupted state
          const loadedSteps = (project.steps || []).map((s) => {
            if (s.status === 'in-progress') {
              return { ...s, status: 'error' as const, description: 'Step was interrupted' };
            }
            return s;
          });

          setSteps(loadedSteps);

          const hasIncomplete = loadedSteps.some(
            (s) => s.status === 'error' || s.status === 'pending'
          );
          setHasInterruptedSteps(hasIncomplete && loadedSteps.length > 0);

          // Select active file or first file
          if (project.activeFile && project.files?.length) {
            const active = findFileByPath(project.files, project.activeFile);
            if (active) setSelectedFile(active);
          } else if (project.files?.length) {
            const getFirstFile = (list: FileItem[]): FileItem | null => {
              for (const f of list) {
                if (f.type === 'file') return f;
                if (f.children) {
                  const nested = getFirstFile(f.children);
                  if (nested) return nested;
                }
              }
              return null;
            };
            const first = getFirstFile(project.files);
            if (first) setSelectedFile(first);
          }
        }
      } catch (err) {
        console.error('Failed to load project from MongoDB:', err);
      } finally {
        setIsInitialized(true);
      }
    }

    loadProject();
  }, [projectId]);

  // -------------------------------------------------------------
  // 2. Debounced Auto-Save to MongoDB
  // -------------------------------------------------------------
  const debouncedSave = useDebouncedCallback(
    async (
      currentId: string,
      currentFiles: FileItem[],
      currentSteps: Step[],
      currentMessages: any[],
      currentActiveFile: string | null,
      currentPrompt: string,
      currentName: string
    ) => {
      try {
        setSaveStatus('saving');
        await api.patch(`/api/projects/${currentId}`, {
          prompt: currentPrompt,
          name: currentName,
          steps: currentSteps,
          files: currentFiles,
          activeFile: currentActiveFile,
          chatMessages: currentMessages,
          status: currentSteps.some((s) => s.status === 'in-progress' || s.status === 'pending')
            ? 'generating'
            : 'completed'
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveStatus('error');
      }
    },
    1000
  );

  // Trigger debounced autosave when core project state changes
  useEffect(() => {
    if (!isInitialized) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (projectId) {
      setSaveStatus('saving');
      debouncedSave(
        projectId,
        files,
        steps,
        llmMessages,
        selectedFile?.path || null,
        initialPrompt,
        projectName
      );
    }
  }, [
    files,
    steps,
    llmMessages,
    selectedFile,
    initialPrompt,
    projectName,
    projectId,
    isInitialized,
    debouncedSave
  ]);

  // -------------------------------------------------------------
  // 3. Map steps into the virtual file structure
  // -------------------------------------------------------------
  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;

    steps
      .filter(({ status }) => status === 'pending')
      .forEach((step) => {
        updateHappened = true;
        if (step?.type === StepType.CreateFile) {
          let parsedPath = step.path?.split('/') ?? [];
          let currentFileStructure = [...originalFiles];
          let finalAnswerRef = currentFileStructure;

          let currentFolder = '';
          while (parsedPath.length) {
            currentFolder = `${currentFolder}/${parsedPath[0]}`;
            let currentFolderName = parsedPath[0];
            parsedPath = parsedPath.slice(1);

            if (!parsedPath.length) {
              // Final file
              let file = currentFileStructure.find((x) => x.path === currentFolder);
              if (!file) {
                currentFileStructure.push({
                  name: currentFolderName!,
                  type: 'file',
                  path: currentFolder,
                  content: step.code
                });
              } else {
                file.content = step.code;
              }
            } else {
              // In a folder
              let folder = currentFileStructure.find((x) => x.path === currentFolder);
              if (!folder) {
                folder = {
                  name: currentFolderName!,
                  type: 'folder',
                  path: currentFolder,
                  children: []
                };
                currentFileStructure.push(folder);
              }

              if (!folder.children) {
                folder.children = [];
              }
              currentFileStructure = folder.children;
            }
          }
          originalFiles = finalAnswerRef;
        }
      });

    if (updateHappened) {
      setFiles(originalFiles);
      setSteps((prev) =>
        prev.map((s) => {
          if (s.status === 'pending') {
            return { ...s, status: 'completed' };
          }
          return s;
        })
      );
    }
  }, [steps, files]);

  // -------------------------------------------------------------
  // 4. WebContainer mounting
  // -------------------------------------------------------------
  useEffect(() => {
    if (!webcontainer || files.length === 0) return;

    const createMountStructure = (fileList: FileItem[]): Record<string, any> => {
      const mountStructure: Record<string, any> = {};

      const processFile = (file: FileItem, isRootFolder: boolean) => {
        if (file.type === 'folder') {
          mountStructure[file.name] = {
            directory: file.children
              ? Object.fromEntries(file.children.map((child) => [child.name, processFile(child, false)]))
              : {}
          };
        } else if (file.type === 'file') {
          if (isRootFolder) {
            mountStructure[file.name] = {
              file: {
                contents: file.content || ''
              }
            };
          } else {
            return {
              file: {
                contents: file.content || ''
              }
            };
          }
        }

        return mountStructure[file.name];
      };

      fileList.forEach((file) => processFile(file, true));
      return mountStructure;
    };

    const mountFiles = async () => {
      try {
        const structure = createMountStructure(files);
        await webcontainer.mount(structure);
      } catch (err) {
        console.warn('WebContainer mount error:', err);
      }
    };

    mountFiles();
  }, [files, webcontainer]);

  // -------------------------------------------------------------
  // 5. Initial AI Template & Generation (For new projects)
  // -------------------------------------------------------------
  const initGeneration = useCallback(async () => {
    const promptToUse = initialPrompt.trim() || 'Build a modern web application';

    try {
      setIsGenerating(true);

      // Ensure project exists in MongoDB
      let activeId = projectId;
      if (!activeId) {
        try {
          const createRes = await api.post<{ success: boolean; data: any }>('/api/projects', {
            prompt: promptToUse,
            name: promptToUse.slice(0, 35) || 'New Project'
          });
          activeId = createRes.data.data._id || createRes.data.data.id;
          setProjectId(activeId);
          if (activeId) {
            window.history.replaceState(null, '', `/builder/${activeId}`);
          }
        } catch (dbErr) {
          console.warn('Could not persist new project immediately:', dbErr);
        }
      }

      // 1. Template determination
      const response = await api.post('/template', { prompt: promptToUse });
      const { prompts, uiPrompts } = response.data;

      // Initial system and UI setup
      if (uiPrompts && uiPrompts[0]) {
        setSteps(
          parseXml(uiPrompts[0]).map((x: Step) => ({
            ...x,
            status: 'pending' as const
          }))
        );
      }

      // 2. Chat generation
      const finalPrompt = [...(prompts || []), promptToUse].map((content) => ({
        role: 'user' as const,
        content
      }));

      let resultText = responce_paint;

      try {
        const chatRes = await api.post('/chat', { messages: finalPrompt });
        if (chatRes.data.response) {
          resultText = chatRes.data.response;
        }
      } catch (chatError) {
        console.warn('Using fallback paint app template:', chatError);
        resultText = responce_paint;
      }

      // Parse generated steps
      const newSteps = parseXml(resultText).map((x) => ({
        ...x,
        status: 'pending' as const
      }));

      setSteps((s) => [...s, ...newSteps]);

      const initialMsgs = [
        ...finalPrompt,
        { role: 'assistant' as const, content: resultText }
      ];
      setLlmMessages(initialMsgs);
    } catch (error) {
      console.error('Initialization error:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [initialPrompt, projectId]);

  // Trigger initial generation if it's a new project with a prompt and no steps loaded
  useEffect(() => {
    if (isInitialized && steps.length === 0 && initialPrompt.trim()) {
      initGeneration();
    }
  }, [isInitialized, steps.length, initialPrompt, initGeneration]);

  // -------------------------------------------------------------
  // 6. Follow-up Chat handler
  // -------------------------------------------------------------
  const handleSendMessage = async () => {
    if (!followupPrompt.trim() || isGenerating) return;

    const newMessage = {
      role: 'user' as const,
      content: followupPrompt.trim()
    };

    setFollowupPrompt('');
    setIsGenerating(true);

    try {
      const updatedMessages = [...llmMessages, newMessage];
      setLlmMessages(updatedMessages);

      const stepsResponse = await api.post('/chat', {
        messages: updatedMessages
      });

      const assistantContent = stepsResponse.data.response || '';

      setLlmMessages((prev) => [
        ...prev,
        { role: 'assistant' as const, content: assistantContent }
      ]);

      const parsedNewSteps = parseXml(assistantContent).map((x) => ({
        ...x,
        status: 'pending' as const
      }));

      setSteps((prev) => [...prev, ...parsedNewSteps]);
    } catch (err) {
      console.error('Chat execution failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {!previewFullscreen ? (
        <>
          {/* Top Header */}
          <header className="h-14 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-20 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                to="/dashboard"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>

              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <h1 className="text-sm font-semibold truncate text-slate-200 max-w-[200px] sm:max-w-md">
                  {initialPrompt || projectName}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Auto-Save Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Saving to MongoDB...</span>
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-400">Save failed</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Saved</span>
                  </>
                )}
              </div>

              {/* Fullscreen Preview Toggle */}
              <button
                onClick={() => setPreviewFullscreen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold transition text-slate-200"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </button>

              <UserMenu />
            </div>
          </header>

          {/* Interrupted steps warning banner */}
          {hasInterruptedSteps && (
            <div className="bg-amber-950/40 border-b border-amber-800/50 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Previous generation had interrupted steps. You can continue prompting or resume work below.
                </span>
              </div>
              <button
                onClick={() => setHasInterruptedSteps(false)}
                className="text-amber-400 hover:text-amber-200 font-medium ml-4 text-[11px]"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Main Builder Layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar: Steps & AI Prompt Chat */}
            <aside className="w-80 border-r border-slate-800 bg-slate-900 flex flex-col shrink-0">
              <div className="flex-1 overflow-y-auto">
                <StepsList steps={steps} />
              </div>

              {/* Follow-up Prompt input box */}
              <div className="p-3 border-t border-slate-800 bg-slate-950/80">
                <div className="relative">
                  <textarea
                    value={followupPrompt}
                    onChange={(e) => setFollowupPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask AI to make changes or add features..."
                    rows={3}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/90 p-3 pr-10 text-xs text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!followupPrompt.trim() || isGenerating}
                    className="absolute right-2.5 bottom-3 p-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white transition disabled:opacity-30 hover:scale-105 active:scale-95 shadow-md shadow-blue-500/20"
                    title="Send follow-up instruction"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </aside>

            {/* Middle Sidebar: File Explorer */}
            <aside className="w-64 border-r border-slate-800 bg-slate-900/70 overflow-y-auto shrink-0">
              <FileExplorer files={files} onFileSelect={setSelectedFile} />
            </aside>

            {/* Main Area: Code Editor & WebContainer Preview Tabs */}
            <main className="flex-1 bg-slate-950 overflow-hidden">
              <TabView
                code={
                  <FileViewer file={selectedFile} onClose={() => setSelectedFile(null)} />
                }
                preview={
                  webcontainer ? (
                    <PreviewFrame files={files} webContainer={webcontainer} />
                  ) : (
                    <div className="flex flex-col h-full items-center justify-center gap-3 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <p className="text-sm font-medium">Initializing WebContainer environment...</p>
                    </div>
                  )
                }
              />
            </main>
          </div>
        </>
      ) : (
        /* Fullscreen Preview Mode */
        <div className="relative h-full w-full bg-slate-950">
          <button
            onClick={() => setPreviewFullscreen(false)}
            className="absolute top-4 right-4 z-50 flex items-center gap-1.5 rounded-xl bg-slate-900/90 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xl hover:bg-slate-800 transition"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Exit Fullscreen
          </button>

          {webcontainer ? (
            <PreviewFrame files={files} webContainer={webcontainer} />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}