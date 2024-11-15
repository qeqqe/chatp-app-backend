import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Sun,
  Moon,
  MessageSquare,
  History,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  tomorrow,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

const API_KEY = import.meta.env.VITE_API_KEY;

const App = () => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [history, setHistory] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  async function generateAnswer() {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      const res = await axios({
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`,
        method: "post",
        data: {
          contents: [{ parts: [{ text: prompt }] }],
        },
      });
      const responseText = res.data.candidates[0].content.parts[0].text;
      setResponse(responseText);
      setHistory([
        ...history,
        { prompt, response: responseText, timestamp: new Date() },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setResponse("Error fetching response.");
    }
    setIsLoading(false);
  }

  const clearHistory = () => {
    setHistory([]);
    setResponse("");
    setPrompt("");
  };

  return (
    <div
      className={`min-h-screen ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      <nav className="fixed top-0 w-full p-4 backdrop-blur-md bg-opacity-80 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">AI Assistant Pro</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <History size={20} />
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className={`fixed right-0 top-0 h-full w-80 p-6 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-xl z-20`}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">History</h2>
              <button
                onClick={clearHistory}
                className="p-2 hover:bg-red-500 rounded-lg transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
            <div className="space-y-4">
              {history.map((item, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-100"
                  }`}
                >
                  <p className="font-semibold">
                    {item.prompt.substring(0, 50)}...
                  </p>
                  <p className="text-sm text-gray-400">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-20 p-6 max-w-4xl mx-auto">
        <motion.div layout className="space-y-6">
          <div className="relative">
            <MessageSquare
              className="absolute left-4 top-4 text-gray-400"
              size={20}
            />
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What would you like to know?"
              className={`w-full pl-12 pr-4 py-4 rounded-xl ${
                isDarkMode
                  ? "bg-gray-800 focus:bg-gray-700"
                  : "bg-white focus:bg-gray-50"
              } border-2 border-transparent focus:border-blue-500 transition-all`}
              rows={4}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generateAnswer}
              disabled={isLoading}
              className={`absolute right-4 bottom-4 px-4 py-2 rounded-lg ${
                isDarkMode ? "bg-blue-600" : "bg-blue-500"
              } text-white font-medium flex items-center gap-2`}
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : null}
              {isLoading ? "Thinking..." : "Generate"}
            </motion.button>
          </div>

          {response && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl p-6 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } shadow-lg`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={isDarkMode ? tomorrow : oneLight}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {response}
              </ReactMarkdown>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default App;
