import {useLocation} from 'react-router-dom'
import { useEffect } from 'react';
import { BACKEND_URL } from '../config.ts';
import { useState } from 'react';
import axios from 'axios';
import {type Step} from '../Types/types.ts';
import {parseXml} from '../steps.ts';
//components

import StepsList from "../components/stepsComponent.tsx";
export function Builder(){
    const location = useLocation();
    const {userPromt} = location.state as { userPromt: string };
    const [chatResponse, setChatResponse] = useState("");
    const [steps, setSteps] = useState<Step[]>([]);

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
            status: "pending", 
        })));
        const result = await axios.post(`${BACKEND_URL}/chat`, { messages: finalPrompt });
        setChatResponse(result.data.response);
    }

    useEffect(() => {
        init();
    }, []);

    return(
        <div>
            <h1>Builder: {userPromt}</h1>
            <p>{chatResponse}</p>
            <StepsList steps={steps} />
        </div>
    );

}