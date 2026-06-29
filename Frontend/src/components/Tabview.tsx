import { useState } from "react";

interface TabViewProps {
  code: React.ReactNode;
  preview: React.ReactNode;
}

export default function TabView({ code, preview }: TabViewProps) {
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab("code")}
          className={`px-4 py-2 ${
            activeTab === "code"
              ? "border-b-2 border-blue-500 text-white"
              : "text-gray-400"
          }`}
        >
          Code
        </button>

        <button
          onClick={() => setActiveTab("preview")}
          className={`px-4 py-2 ${
            activeTab === "preview"
              ? "border-b-2 border-blue-500 text-white"
              : "text-gray-400"
          }`}
        >
          Preview
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "code" ? code : preview}
      </div>
    </div>
  );
}