/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppStatus, ChatMessage } from './types';
import * as geminiService from './services/geminiService';
import Spinner from './components/Spinner';
import WelcomeScreen from './components/WelcomeScreen';
import ProgressBar from './components/ProgressBar';
import ChatInterface from './components/ChatInterface';
import PatientLogin from './components/PatientLogin';

declare global {
    interface AIStudio {
        openSelectKey: () => Promise<void>;
        hasSelectedApiKey: () => Promise<boolean>;
    }
    interface Window {
        aistudio?: AIStudio;
    }
}

const App: React.FC = () => {
    const [status, setStatus] = useState<AppStatus>(AppStatus.Initializing);
    const [isApiKeySelected, setIsApiKeySelected] = useState(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number, message?: string, fileName?: string } | null>(null);
    const [activeRagStoreName, setActiveRagStoreName] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isQueryLoading, setIsQueryLoading] = useState(false);
    const [exampleQuestions, setExampleQuestions] = useState<string[]>([]);
    const [documentName, setDocumentName] = useState<string>('');
    const [files, setFiles] = useState<File[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [patientName, setPatientName] = useState<string>('');

    const ragStoreNameRef = useRef(activeRagStoreName);

    useEffect(() => {
        ragStoreNameRef.current = activeRagStoreName;
    }, [activeRagStoreName]);
    
    const checkApiKey = useCallback(async () => {
        if (window.aistudio?.hasSelectedApiKey) {
            try {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsApiKeySelected(hasKey);
            } catch (e) {
                console.error("Error checking for API key:", e);
                setIsApiKeySelected(false); 
            }
        }
    }, []);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkApiKey();
            }
        };
        
        checkApiKey();
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', checkApiKey);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', checkApiKey);
        };
    }, [checkApiKey]);

    useEffect(() => {
        const handleUnload = () => {
            if (ragStoreNameRef.current) {
                geminiService.deleteRagStore(ragStoreNameRef.current)
                    .catch(err => console.error("Error deleting RAG store on unload:", err));
            }
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, []);


    const handleError = (message: string, err: any) => {
        console.error(message, err);
        setError(`${message}${err ? `: ${err instanceof Error ? err.message : String(err)}` : ''}`);
        setStatus(AppStatus.Error);
    };

    const clearError = () => {
        setError(null);
        setStatus(AppStatus.Welcome);
    }

    useEffect(() => {
        setStatus(AppStatus.Welcome);
    }, []);

    const handleSelectKey = async () => {
        if (window.aistudio?.openSelectKey) {
            try {
                await window.aistudio.openSelectKey();
                await checkApiKey(); 
            } catch (err) {
                console.error("Failed to open API key selection dialog", err);
            }
        } else {
            alert('API key selection is not available in this environment.');
        }
    };

    const handleAdminSetupComplete = async () => {
        if (!isApiKeySelected) {
            setApiKeyError("請先選擇您的 Gemini API Key。");
            throw new Error("API Key is required.");
        }
        
        setApiKeyError(null);

        try {
            geminiService.initialize();
        } catch (err) {
            handleError("初始化失敗，請選擇有效的 API Key。", err);
            throw err;
        }

        // If no files, we skip RAG creation or create empty one
        // For demo purposes, we always create a store to keep logic consistent
        setStatus(AppStatus.Uploading);
        const totalSteps = files.length + 2;
        setUploadProgress({ current: 0, total: totalSteps, message: "正在初始化診所資料庫..." });

        try {
            const storeName = `clinic-session-${Date.now()}`;
            const ragStoreName = await geminiService.createRagStore(storeName);
            
            setUploadProgress({ current: 1, total: totalSteps, message: "正在處理知識庫..." });

            for (let i = 0; i < files.length; i++) {
                setUploadProgress(prev => ({ 
                    ...(prev!),
                    current: i + 1,
                    message: "正在匯入文件...",
                    fileName: `(${i + 1}/${files.length}) ${files[i].name}`
                }));
                await geminiService.uploadToRagStore(ragStoreName, files[i]);
            }
            
            setUploadProgress({ current: files.length + 1, total: totalSteps, message: "正在生成建議問題...", fileName: "" });
            // If no files, this might return default questions
            const questions = await geminiService.generateExampleQuestions(ragStoreName);
            setExampleQuestions(questions);

            setUploadProgress({ current: totalSteps, total: totalSteps, message: "系統準備就緒", fileName: "" });
            
            await new Promise(resolve => setTimeout(resolve, 500)); 

            let docName = '診所 AI 助理';
            if (files.length > 0) docName = '診所知識庫';
            setDocumentName(docName);

            setActiveRagStoreName(ragStoreName);
            setChatHistory([]);
            
            // Move to Patient Binding instead of straight to Chat
            setStatus(AppStatus.Binding);
            setFiles([]); 
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
            if (errorMessage.includes('api key not valid') || errorMessage.includes('requested entity was not found')) {
                setApiKeyError("選擇的 API Key 無效，請重新選擇。");
                setIsApiKeySelected(false);
                setStatus(AppStatus.Welcome);
            } else {
                handleError("啟動會話失敗", err);
            }
            throw err;
        } finally {
            setUploadProgress(null);
        }
    };

    const handlePatientLogin = (name: string, phone: string) => {
        setPatientName(name);
        // Pre-fill chat with welcome message using Markdown Flex styling
        setChatHistory([{
            role: 'model',
            parts: [{ text: `# 歡迎回來，${name} \n\n今天有什麼我可以幫您的嗎？您可以詢問：\n\n- 門診時間\n- 預約掛號\n- 醫師介紹` }]
        }]);
        setStatus(AppStatus.Chatting);
    };

    const handleEndChat = () => {
        if (activeRagStoreName) {
            geminiService.deleteRagStore(activeRagStoreName).catch(err => {
                console.error("Failed to delete RAG store in background", err);
            });
        }
        setActiveRagStoreName(null);
        setChatHistory([]);
        setExampleQuestions([]);
        setDocumentName('');
        setFiles([]);
        setStatus(AppStatus.Welcome);
    };

    const handleSendMessage = async (message: string) => {
        if (!activeRagStoreName) return;

        const userMessage: ChatMessage = { role: 'user', parts: [{ text: message }] };
        setChatHistory(prev => [...prev, userMessage]);
        setIsQueryLoading(true);

        try {
            const result = await geminiService.fileSearch(activeRagStoreName, message);
            const modelMessage: ChatMessage = {
                role: 'model',
                parts: [{ text: result.text }],
                groundingChunks: result.groundingChunks,
                isCrisis: result.isCrisis
            };
            setChatHistory(prev => [...prev, modelMessage]);
        } catch (err) {
            const errorMessage: ChatMessage = {
                role: 'model',
                parts: [{ text: "抱歉，發生錯誤，請重試。" }]
            };
            setChatHistory(prev => [...prev, errorMessage]);
            handleError("取得回應失敗", err);
        } finally {
            setIsQueryLoading(false);
        }
    };
    
    const renderContent = () => {
        switch(status) {
            case AppStatus.Initializing:
                return (
                    <div className="flex items-center justify-center h-screen">
                        <Spinner /> <span className="ml-4 text-xl text-gem-offwhite">正在初始化...</span>
                    </div>
                );
            case AppStatus.Welcome:
                 return <WelcomeScreen onUpload={handleAdminSetupComplete} apiKeyError={apiKeyError} files={files} setFiles={setFiles} isApiKeySelected={isApiKeySelected} onSelectKey={handleSelectKey} />;
            case AppStatus.Uploading:
                 // Use generic progress for system setup
                return <ProgressBar 
                    progress={uploadProgress?.current || 0} 
                    total={uploadProgress?.total || 1} 
                    message={uploadProgress?.message || "正在設定系統..."} 
                    fileName={uploadProgress?.fileName}
                />;
            case AppStatus.Binding:
                return <PatientLogin onLoginSuccess={handlePatientLogin} />;
            case AppStatus.Chatting:
                return <ChatInterface 
                    documentName={documentName}
                    history={chatHistory}
                    isQueryLoading={isQueryLoading}
                    onSendMessage={handleSendMessage}
                    onNewChat={handleEndChat}
                    exampleQuestions={exampleQuestions}
                />;
            case AppStatus.Error:
                 return (
                    <div className="flex flex-col items-center justify-center h-screen bg-red-50 text-red-800">
                        <h1 className="text-3xl font-bold mb-4">系統錯誤</h1>
                        <p className="max-w-md text-center mb-4">{error}</p>
                        <button onClick={clearError} className="px-4 py-2 rounded-md bg-gem-mist hover:bg-gem-mist/80 transition-colors" title="回到開始畫面">
                           重新開始
                        </button>
                    </div>
                );
            default:
                 return <WelcomeScreen onUpload={handleAdminSetupComplete} apiKeyError={apiKeyError} files={files} setFiles={setFiles} isApiKeySelected={isApiKeySelected} onSelectKey={handleSelectKey} />;
        }
    }

    return (
        <main className="h-screen bg-gem-onyx text-gem-offwhite">
            {renderContent()}
        </main>
    );
};

export default App;