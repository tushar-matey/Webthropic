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
       <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center px-6">
        <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-10">
            <div className="text-center mb-10">
            <h1 className="text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-500 bg-clip-text text-transparent">
                Webthropic
            </h1>

            <p className="mt-4 text-lg text-slate-400">
                Build amazing web applications from a single prompt.
            </p>
            </div>

            <form
            onSubmit={HandleSubmit}
            className="flex flex-col sm:flex-row gap-4"
            >
            <input
                type="text"
                value={userPromt}
                onChange={(e) => setUserPromt(e.target.value)}
                placeholder="Describe what you want to build..."
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-4 text-white placeholder:text-slate-500 outline-none transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
            />

            <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-8 py-4 font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 active:scale-95"
            >
                Build
            </button>
            </form>
        </div>
        </div>
    );
}