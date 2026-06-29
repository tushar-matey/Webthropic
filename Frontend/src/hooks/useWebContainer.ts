import  { useEffect ,useState} from 'react';
import { WebContainer } from '@webcontainer/api';


let instance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export async function getWebContainer() {
    if (instance) return instance;

    if (bootPromise) return bootPromise;

    bootPromise = WebContainer.boot();

    instance = await bootPromise;

    return instance;
}
export function useWebContainer() {
    const [webContainer, setWebContainer] = useState<WebContainer>();

    useEffect(() => {
        getWebContainer().then(setWebContainer);
    }, []);

    return webContainer;
}



// export function useWebContainer() {
//     const [webContainer, setWebContainer] = useState<WebContainer>();
//     const main = async () => {
//         const webcontainerInstance = await WebContainer.boot();
//         console.log("WebContainer instance:", webcontainerInstance);
//         setWebContainer(webcontainerInstance);
//     }
//     useEffect(() => {
//         main();
//     }, []);

//     return webContainer;
// }