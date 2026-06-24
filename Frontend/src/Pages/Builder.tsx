import {useLocation} from 'react-router-dom'
import { useEffect } from 'react';
import { BACKEND_URL } from '../config.ts';
import { useState } from 'react';
import axios from 'axios';
export function Builder(){
    const location = useLocation();
    const {userPromt} = location.state as { userPromt: string };
    const [chatResponse, setChatResponse] = useState("");

    async function init(){
        const response = await axios.post(`${BACKEND_URL}/template`, { prompt: userPromt.trim() });
        const {prompts, uiprompt} = response.data;
        // You can add any additional logic here that needs to run when the component mounts
        const finalPrompt = [...prompts,userPromt].map((content)=>{
            return{
                role: "user",
                content
            }
        });
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
        </div>
    );

}