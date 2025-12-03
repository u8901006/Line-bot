/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback } from 'react';
import UploadCloudIcon from './icons/UploadCloudIcon';
import TrashIcon from './icons/TrashIcon';

interface WelcomeScreenProps {
    onUpload: () => Promise<void>;
    apiKeyError: string | null;
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
    isApiKeySelected: boolean;
    onSelectKey: () => Promise<void>;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onUpload, apiKeyError, files, setFiles, isApiKeySelected, onSelectKey }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };
    
    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (event.dataTransfer.files) {
            setFiles(prev => [...prev, ...Array.from(event.dataTransfer.files)]);
        }
    }, [setFiles]);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isDragging) setIsDragging(true);
    }, [isDragging]);
    
    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleRemoveFile = (indexToRemove: number) => {
        setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    };

    const handleSelectKeyClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        await onSelectKey();
    };

    const handleSkip = async () => {
         // Simulate uploading nothing to proceed to login
         await onUpload();
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 bg-gem-onyx">
            <div className="w-full max-w-3xl text-center">
                <div className="mb-6 flex justify-center">
                    <div className="p-4 bg-white rounded-full shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-clinic-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                        </svg>
                    </div>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-gem-offwhite">診所系統設定</h1>
                <p className="text-gem-offwhite/70 mb-8">
                    步驟 1：上傳診所知識庫（手冊、FAQ、政策文件）以供 AI 助理使用。
                </p>

                <div className="w-full max-w-xl mx-auto mb-8">
                     {!isApiKeySelected ? (
                        <button
                            onClick={handleSelectKeyClick}
                            className="w-full bg-clinic-blue hover:bg-blue-600 text-white font-semibold rounded-lg py-3 px-5 text-center focus:outline-none focus:ring-2 focus:ring-clinic-blue shadow-sm"
                        >
                            連結 Gemini API
                        </button>
                    ) : (
                        <div className="w-full bg-white border border-green-200 rounded-lg py-3 px-5 text-center text-green-600 font-semibold shadow-sm">
                            ✓ 系統已連結
                        </div>
                    )}
                     {apiKeyError && <p className="text-red-500 text-sm mt-2">{apiKeyError}</p>}
                </div>

                <div 
                    className={`relative border-2 border-dashed rounded-lg p-10 text-center transition-colors mb-6 bg-white ${isDragging ? 'border-clinic-blue bg-blue-50' : 'border-gem-mist'}`}
                    onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                >
                    <div className="flex flex-col items-center justify-center">
                        <UploadCloudIcon />
                        <p className="mt-4 text-lg text-gem-offwhite/80">將診所 PDF/TXT 文件拖放到此處。</p>
                        <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.txt,.md"/>
                         <label 
                            htmlFor="file-upload" 
                            className="mt-4 cursor-pointer px-6 py-2 bg-gem-mist text-gem-offwhite rounded-full font-semibold hover:bg-gem-mist/80 transition-colors" 
                            tabIndex={0}
                         >
                            瀏覽檔案
                        </label>
                    </div>
                </div>

                {files.length > 0 && (
                    <div className="w-full max-w-xl mx-auto mb-6 text-left">
                        <h4 className="font-semibold mb-2 text-gem-offwhite">知識庫檔案 ({files.length}):</h4>
                        <ul className="max-h-36 overflow-y-auto space-y-1 pr-2">
                            {files.map((file, index) => (
                                <li key={`${file.name}-${index}`} className="text-sm bg-white border border-gem-mist p-2 rounded-md flex justify-between items-center group shadow-sm">
                                    <span className="truncate text-gem-offwhite" title={file.name}>{file.name}</span>
                                    <div className="flex items-center flex-shrink-0">
                                        <span className="text-xs text-gem-offwhite/50 ml-2">{(file.size / 1024).toFixed(2)} KB</span>
                                        <button 
                                            onClick={() => handleRemoveFile(index)}
                                            className="ml-2 p-1 text-red-400 hover:text-red-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <div className="w-full max-w-xl mx-auto flex gap-4">
                    <button 
                         onClick={files.length > 0 ? handleSkip : handleSkip}
                         className="flex-1 px-6 py-3 rounded-md bg-white border border-gem-mist text-gem-offwhite font-bold transition-colors hover:bg-gray-50"
                         disabled={!isApiKeySelected}
                    >
                        {files.length > 0 ? "跳過上傳" : "使用預設知識庫"}
                    </button>
                    {files.length > 0 && (
                        <button 
                            onClick={onUpload}
                            disabled={!isApiKeySelected}
                            className="flex-1 px-6 py-3 rounded-md bg-clinic-blue hover:bg-blue-600 text-white font-bold transition-colors shadow-sm disabled:opacity-50"
                        >
                            初始化系統
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;