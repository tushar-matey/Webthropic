import {useLocation} from 'react-router-dom'
import { useEffect } from 'react';
import { useState } from 'react';
import axios from 'axios';

//exciting files
import {type FileItem, type Step,StepType} from '../Types/types.ts';
import {parseXml} from '../steps.ts';
import { BACKEND_URL } from '../config.ts';

//webcontainer

import { useWebContainer } from '../hooks/useWebContainer';

//components
import StepsList from "../components/stepsComponent.tsx";
import {FileExplorer, FileViewer} from "../components/fileExplorer.tsx";
import { PreviewFrame } from '../components/Preview.tsx';
import TabView from '../components/Tabview.tsx';


//temp import for testing
import {todo_response,responce_paint}from '../config.ts';

export function Builder(){
    const location = useLocation();
    const {userPromt} = location.state as { userPromt: string };
    const [chatResponse, setChatResponse] = useState("");
    const [steps, setSteps] = useState<Step[]>([]);
    
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [files, setFiles] = useState<FileItem[]>([]);

    //webcontainer
    const webcontainer = useWebContainer();


    //for maping steps in the file structure
    useEffect(() => {
        let originalFiles = [...files];
        let updateHappened = false;
        steps.filter(({status}) => status === "pending").map(step => {
        updateHappened = true;
        if (step?.type === StepType.CreateFile) {
            let parsedPath = step.path?.split("/") ?? []; // ["src", "components", "App.tsx"]
            let currentFileStructure = [...originalFiles]; // {}
            let finalAnswerRef = currentFileStructure;
    
            let currentFolder = ""
            while(parsedPath.length) {
            currentFolder =  `${currentFolder}/${parsedPath[0]}`;
            let currentFolderName = parsedPath[0];
            parsedPath = parsedPath.slice(1);
    
            if (!parsedPath.length) {
                // final file
                let file = currentFileStructure.find(x => x.path === currentFolder)
                if (!file) {
                currentFileStructure.push({
                    name: currentFolderName,
                    type: 'file',
                    path: currentFolder,
                    content: step.code
                })
                } else {
                file.content = step.code;
                }
            } else {
                /// in a folder
                let folder = currentFileStructure.find(x => x.path === currentFolder)
                if (!folder) {
                // create the folder
                currentFileStructure.push({
                    name: currentFolderName,
                    type: 'folder',
                    path: currentFolder,
                    children: []
                })
                }
    
                currentFileStructure = currentFileStructure.find(x => x.path === currentFolder)!.children!;
            }
            }
            originalFiles = finalAnswerRef;
        }

        })

        if (updateHappened) {

        setFiles(originalFiles)
        setSteps(steps => steps.map((s: Step) => {
            return {
            ...s,
            status: "completed"
            }
            
        }))
        }
        console.log(files);
    }, [steps, files]);


    //for webcontainer mounting
      useEffect(() => {
    const createMountStructure = (files: FileItem[]): Record<string, any> => {
      const mountStructure: Record<string, any> = {};
  
      const processFile = (file: FileItem, isRootFolder: boolean) => {  
        if (file.type === 'folder') {
          // For folders, create a directory entry
          mountStructure[file.name] = {
            directory: file.children ? 
              Object.fromEntries(
                file.children.map(child => [child.name, processFile(child, false)])
              ) 
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
            // For files, create a file entry with contents
            return {
              file: {
                contents: file.content || ''
              }
            };
          }
        }
  
        return mountStructure[file.name];
      };
  
      // Process each top-level file/folder
      files.forEach(file => processFile(file, true));
  
      return mountStructure;
    };
  
    const mountStructure = createMountStructure(files);
  
      // Mount the structure if WebContainer is available
      const mountFiles = async () => {
      if (!webcontainer) return;

      const mountStructure = createMountStructure(files);

      console.log(mountStructure);

      await webcontainer.mount(mountStructure);

      console.log("Mounted successfully");
    };

    mountFiles();
  }, [files, webcontainer]);

//backend calls and steps parsing
    async function init(){
        const response = await axios.post(`${BACKEND_URL}/template`, { prompt: userPromt.trim() });
        const {prompts, uiPrompts} = response.data;
       console.log(response.data);
        const finalPrompt = [...prompts,userPromt].map((content)=>{
            return{
                role: "user",
                content
            }
        });
        setSteps(parseXml(uiPrompts[0]).map((x: Step) => ({
            ...x,
            status: "pending" as "pending" 
        })));

        //for testing uncomment
        // const result=responce_paint;
        // setChatResponse(result);
        // setSteps(s => [...s, ...parseXml(result).map(x => ({
        //   ...x,
        //   status: "pending" as "pending"
        // }))]);
        
        //for testing comment
        const result = await axios.post(`${BACKEND_URL}/chat`, { messages: finalPrompt });
        setChatResponse(result.data.response);
        setSteps(s => [...s, ...parseXml(result.data.response).map(x => ({
          ...x,
          status: "pending" as "pending"
        }))]);
        //
    }

    useEffect(() => {
        init();
    }, []);

    const [previewFullscreen, setPreviewFullscreen] = useState(false);
    return(
        // <div>
        //     <h1>Builder: {userPromt}</h1>
        //     {/* <p>{chatResponse}</p> */}
        //     <div className="flex flex-row gap-4">
        //     <StepsList steps={steps} />
        //     <div className="flex flex-col gap-4">
        //         <FileExplorer
        //             files={files}
        //             onFileSelect={setSelectedFile}
        //         />

        //         <TabView
        //           code={
        //             <FileViewer
        //               file={selectedFile}
        //               onClose={() => setSelectedFile(null)}
        //             />
        //           }
        //           preview={
        //             webcontainer ? (
        //               <PreviewFrame
        //                 files={files}
        //                 webContainer={webcontainer}
        //               />
        //             ) : (
        //               <div>Loading WebContainer...</div>
        //             )
        //           }
        //         />
        //     </div>
        //     </div>
        // </div>
        
      <div className="h-screen bg-slate-950 text-white flex flex-col">

      {!previewFullscreen ? (
        <>
          {/* Header */}
          <header className="h-14 border-b border-slate-800 px-6 flex items-center justify-between">
            <h1 className="text-lg font-semibold truncate">
              {userPromt}
            </h1>

            <button
              onClick={() => setPreviewFullscreen(true)}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700 transition"
            >
              Full Preview
            </button>
          </header>

          {/* Main Layout */}
          <div className="flex flex-1 overflow-hidden">

            {/* Steps */}
            <aside className="w-72 border-r border-slate-800 bg-slate-900 overflow-y-auto">
              <StepsList steps={steps} />
            </aside>

            {/* File Explorer */}
            <aside className="w-72 border-r border-slate-800 bg-slate-900 overflow-y-auto">
              <FileExplorer
                files={files}
                onFileSelect={setSelectedFile}
              />
            </aside>

            {/* Editor + Preview */}
            <main className="flex-1 bg-slate-950 overflow-hidden">
              <TabView
                code={
                  <FileViewer
                    file={selectedFile}
                    onClose={() => setSelectedFile(null)}
                  />
                }
                preview={
                  webcontainer ? (
                    <PreviewFrame
                      files={files}
                      webContainer={webcontainer}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      Loading WebContainer...
                    </div>
                  )
                }
              />
            </main>

          </div>
        </>
      ) : (
        // Fullscreen Preview
        <div className="relative h-full w-full bg-slate-950">
          <button
            onClick={() => setPreviewFullscreen(false)}
            className="absolute top-4 right-4 z-10 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 transition"
          >
            Exit Full Preview
          </button>

          {webcontainer ? (
            <PreviewFrame
              files={files}
              webContainer={webcontainer}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              Loading WebContainer...
            </div>
          )}
        </div>
      )}
    </div>
    );
    

}