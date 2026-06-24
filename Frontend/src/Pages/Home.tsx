import { useState } from "react";
import {useNavigate} from 'react-router-dom'

export function Home(){
    const [userPromt,setUserPromt] = useState("");
    const navigate = useNavigate();

    const HandleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log(`User Prompt: ${userPromt}`);
        if(userPromt.trim() ){

            navigate('/Builder',{state:{userPromt}});
        }
    }
    return(
        <div>
            <h1>Webthropic</h1>
            <form onSubmit={HandleSubmit}>
                <input
                    type="text"
                    value={userPromt}
                    onChange={(e) => setUserPromt(e.target.value)}
                    placeholder="Enter your prompt"
                />
                <button type="submit">Build</button>
            </form>
        </div>
    );
}