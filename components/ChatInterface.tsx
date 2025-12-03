/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import Spinner from './Spinner';
import SendIcon from './icons/SendIcon';
import RefreshIcon from './icons/RefreshIcon';

interface ChatInterfaceProps {
    documentName: string;
    history: ChatMessage[];
    isQueryLoading: boolean;
    onSendMessage: (message: string) => void;
    onNewChat: () => void;
    exampleQuestions: string[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ documentName, history, isQueryLoading, onSendMessage, onNewChat, exampleQuestions }) => {
    const [query, setQuery] = useState('');
    const [currentSuggestion, setCurrentSuggestion] = useState('');
    const [modalContent, setModalContent] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (exampleQuestions.length === 0) {
            setCurrentSuggestion('');
            return;
        }

        setCurrentSuggestion(exampleQuestions[0]);
        let suggestionIndex = 0;
        const intervalId = setInterval(() => {
            suggestionIndex = (suggestionIndex + 1) % exampleQuestions.length;
            setCurrentSuggestion(exampleQuestions[suggestionIndex]);
        }, 5000);

        return () => clearInterval(intervalId);
    }, [exampleQuestions]);
    
    // 2.1 Middleware: Markdown-to-Flex Converter Logic
    const renderMarkdown = (text: string) => {
        if (!text) return { __html: '' };

        const lines = text.split('\n');
        let html = '';
        let listType: 'ul' | 'ol' | null = null;
        let paraBuffer = '';

        function flushPara() {
            if (paraBuffer) {
                html += `<p class="my-2">${paraBuffer}</p>`;
                paraBuffer = '';
            }
        }

        function flushList() {
            if (listType) {
                html += `</${listType}>`;
                listType = null;
            }
        }

        for (const rawLine of lines) {
            let line = rawLine;

            // Headers (#, ##): Convert to Bold Text, Color: #F5A623 (Warm Orange) or #4A90E2 (Calming Blue).
            if (line.startsWith('# ')) {
                flushPara(); flushList();
                html += `<h1 class="text-xl font-bold text-clinic-orange mt-4 mb-2 border-b border-clinic-orange/20 pb-1">${line.substring(2)}</h1>`;
                continue;
            }
            if (line.startsWith('## ')) {
                flushPara(); flushList();
                html += `<h2 class="text-lg font-bold text-clinic-blue mt-3 mb-2">${line.substring(3)}</h2>`;
                continue;
            }

            line = line
                .replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>')
                .replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>')
                .replace(/`([^`]+)`/g, '<code class="bg-gem-mist/50 px-1 py-0.5 rounded-sm font-mono text-sm">$1</code>');

            const isOl = line.match(/^\s*\d+\.\s(.*)/);
            const isUl = line.match(/^\s*[\*\-]\s(.*)/);

            if (isOl) {
                flushPara();
                if (listType !== 'ol') {
                    flushList();
                    html += '<ol class="list-decimal list-inside my-2 pl-5 space-y-1">';
                    listType = 'ol';
                }
                html += `<li>${isOl[1]}</li>`;
            } else if (isUl) {
                flushPara();
                if (listType !== 'ul') {
                    flushList();
                    html += '<ul class="list-none my-2 pl-2 space-y-1">';
                    listType = 'ul';
                }
                // Custom dot icon for list items as per spec: "vertical box layout with a small dot icon"
                html += `<li class="flex items-start"><span class="mr-2 text-clinic-orange font-bold text-lg leading-none">•</span><span>${isUl[1]}</span></li>`;
            } else {
                flushList();
                if (line.trim() === '') {
                    flushPara();
                } else {
                    paraBuffer += (paraBuffer ? '<br/>' : '') + line;
                }
            }
        }

        flushPara();
        flushList();

        return { __html: html };
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSendMessage(query);
            setQuery('');
        }
    };

    const handleSourceClick = (text: string) => {
        setModalContent(text);
    };

    const closeModal = () => {
        setModalContent(null);
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, isQueryLoading]);

    // 2.2 Crisis Card Content
    const renderCrisisCard = () => (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm w-full animate-pulse my-2">
            <h3 className="text-lg font-bold text-red-700 mb-2">我們都在這裡陪你</h3>
            <p className="text-red-600 mb-4 font-medium">感受到您現在很痛苦，請給我們機會協助您。</p>
            <div className="flex flex-col space-y-2">
                <a href="tel:1995" className="bg-red-600 hover:bg-red-700 text-white text-center py-2.5 rounded-md font-semibold transition-colors shadow-sm">
                    撥打 1995 (生命線)
                </a>
                <a href="tel:1925" className="bg-red-600 hover:bg-red-700 text-white text-center py-2.5 rounded-md font-semibold transition-colors shadow-sm">
                    撥打 1925 (安心專線)
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} className="bg-white border-2 border-red-600 text-red-600 hover:bg-red-50 text-center py-2.5 rounded-md font-semibold transition-colors">
                    撥打診所緊急專線
                </a>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full relative">
            <header className="absolute top-0 left-0 right-0 p-4 bg-gem-onyx/90 backdrop-blur-sm z-10 flex justify-between items-center border-b border-gem-mist">
                <div className="w-full max-w-4xl mx-auto flex justify-between items-center px-4">
                    <h1 className="text-xl font-bold text-clinic-blue truncate flex items-center gap-2">
                        <span className="text-2xl">🛡️</span> 身心科診所智慧助理
                    </h1>
                    <button
                        onClick={onNewChat}
                        className="flex items-center px-4 py-2 bg-clinic-blue hover:bg-blue-600 rounded-full text-white transition-colors flex-shrink-0 text-sm shadow-sm"
                        title="登出並清除對話"
                    >
                        <RefreshIcon />
                        <span className="ml-2 hidden sm:inline">登出</span>
                    </button>
                </div>
            </header>

            <div className="flex-grow pt-24 pb-32 overflow-y-auto px-4 bg-gem-onyx">
                <div className="w-full max-w-4xl mx-auto space-y-6">
                    {history.map((message, index) => (
                        <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {message.isCrisis ? (
                                <div className="max-w-xl lg:max-w-2xl w-full">
                                    {renderCrisisCard()}
                                </div>
                            ) : (
                                <div className={`max-w-xl lg:max-w-2xl px-5 py-3 rounded-2xl ${
                                    message.role === 'user' 
                                    ? 'bg-clinic-blue text-white shadow-md' 
                                    : 'bg-white text-gem-offwhite border border-gem-mist shadow-sm'
                                }`}>
                                    <div dangerouslySetInnerHTML={renderMarkdown(message.parts[0].text)} />
                                    {message.role === 'model' && message.groundingChunks && message.groundingChunks.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-gem-mist/50">
                                            <h4 className="text-xs font-semibold text-gem-offwhite/50 mb-2 text-right">資料來源：</h4>
                                            <div className="flex flex-wrap gap-2 justify-end">
                                                {message.groundingChunks.map((chunk, chunkIndex) => (
                                                    chunk.retrievedContext?.text && (
                                                        <button
                                                            key={chunkIndex}
                                                            onClick={() => handleSourceClick(chunk.retrievedContext!.text!)}
                                                            className="bg-gem-mist/50 hover:bg-gem-mist text-xs px-3 py-1 rounded-md transition-colors text-gem-offwhite/70"
                                                            aria-label={`檢視來源 ${chunkIndex + 1}`}
                                                            title="檢視來源文件片段"
                                                        >
                                                            來源 {chunkIndex + 1}
                                                        </button>
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {isQueryLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-xl lg:max-w-2xl px-5 py-3 rounded-2xl bg-white border border-gem-mist shadow-sm flex items-center">
                                <Spinner />
                                <span className="ml-3 text-gem-offwhite/60">正在思考中...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gem-onyx/90 backdrop-blur-sm border-t border-gem-mist">
                 <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-2 min-h-[2rem] flex items-center justify-center">
                        {!isQueryLoading && currentSuggestion && (
                            <button
                                onClick={() => setQuery(currentSuggestion)}
                                className="text-sm text-clinic-blue bg-white border border-clinic-blue hover:bg-blue-50 transition-colors px-4 py-1.5 rounded-full shadow-sm"
                            >
                                試問：「{currentSuggestion}」
                            </button>
                        )}
                    </div>
                     <form onSubmit={handleSubmit} className="flex items-center space-x-3">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="請輸入您的問題..."
                            className="flex-grow bg-white border border-gem-mist rounded-full py-3 px-5 focus:outline-none focus:ring-2 focus:ring-clinic-blue shadow-sm"
                            disabled={isQueryLoading}
                        />
                        <button type="submit" disabled={isQueryLoading || !query.trim()} className="p-3 bg-clinic-blue hover:bg-blue-600 rounded-full text-white disabled:bg-gem-mist transition-colors shadow-sm" title="發送訊息">
                            <SendIcon />
                        </button>
                    </form>
                </div>
            </div>

            {modalContent !== null && (
                <div 
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" 
                    onClick={closeModal} 
                    role="dialog" 
                    aria-modal="true"
                    aria-labelledby="source-modal-title"
                >
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <h3 id="source-modal-title" className="text-xl font-bold mb-4 text-gem-offwhite">來源上下文</h3>
                        <div 
                            className="flex-grow overflow-y-auto pr-4 text-gem-offwhite/80 border-t border-b border-gem-mist py-4"
                            dangerouslySetInnerHTML={renderMarkdown(modalContent || '')}
                        >
                        </div>
                        <div className="flex justify-end mt-6">
                            <button onClick={closeModal} className="px-6 py-2 rounded-md bg-clinic-blue hover:bg-blue-600 text-white transition-colors">
                                關閉
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatInterface;