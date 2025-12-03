/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { QueryResult } from '../types';

let ai: GoogleGenAI;

// 2.2 Safety Guardrails - Crisis Intervention Keywords
const CRISIS_KEYWORDS = ["想死", "自殺", "suicide", "hurt myself", "絕望", "不想活", "結束生命", "痛苦", "找不到出口"];

export function initialize() {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createRagStore(displayName: string): Promise<string> {
    if (!ai) throw new Error("Gemini AI not initialized");
    const ragStore = await ai.fileSearchStores.create({ config: { displayName } });
    if (!ragStore.name) {
        throw new Error("Failed to create RAG store: name is missing.");
    }
    return ragStore.name;
}

export async function uploadToRagStore(ragStoreName: string, file: File): Promise<void> {
    if (!ai) throw new Error("Gemini AI not initialized");
    
    let op = await ai.fileSearchStores.uploadToFileSearchStore({
        fileSearchStoreName: ragStoreName,
        file: file
    });

    while (!op.done) {
        await delay(3000);
        op = await ai.operations.get({operation: op});
    }
}

export async function fileSearch(ragStoreName: string, query: string): Promise<QueryResult> {
    if (!ai) throw new Error("Gemini AI not initialized");

    // Safety Guardrails: Crisis Intervention
    // If user input contains crisis keywords, we skip the API call or intercept it.
    const lowerQuery = query.toLowerCase();
    if (CRISIS_KEYWORDS.some(keyword => lowerQuery.includes(keyword))) {
        return {
            text: "CRISIS_DETECTED",
            groundingChunks: [],
            isCrisis: true
        };
    }

    // 2.5 Administrative FAQ (RAG Lite) System Prompt
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
            systemInstruction: "你是一間身心科診所的溫暖、具同理心的 AI 助理。請務必使用繁體中文 (Traditional Chinese) 回答。回答請簡潔。如果是醫療建議，請加上標準免責聲明：「請親自諮詢醫師」。不要提及你是 AI，專注於提供協助。請使用 Markdown 格式回答：\n\n- 使用 # 或 ## 標示重點標題（會轉換為醒目的顏色）。\n- 使用清單項目（- 或 *）條列資訊。",
            tools: [
                    {
                        fileSearch: {
                            fileSearchStoreNames: [ragStoreName],
                        }
                    }
                ]
        }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return {
        text: response.text,
        groundingChunks: groundingChunks,
        isCrisis: false
    };
}

export async function generateExampleQuestions(ragStoreName: string): Promise<string[]> {
    if (!ai) throw new Error("Gemini AI not initialized");
    try {
        // Updated prompt for Clinic context in Chinese
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "根據提供的診所文件（手冊、FAQ、政策），找出相關語境並生成 4 個病患可能會問的通用、溫暖且有幫助的問題（例如：「如何預約？」、「營業時間為何？」、「我的資料隱私安全嗎？」）。請務必使用繁體中文 (Traditional Chinese) 回傳。格式為 JSON 字串陣列。",
            config: {
                tools: [
                    {
                        fileSearch: {
                            fileSearchStoreNames: [ragStoreName],
                        }
                    }
                ],
                responseMimeType: "application/json"
            }
        });
        
        let jsonText = response.text.trim();
        
        // Attempt to parse JSON
        let parsedData;
        try {
            parsedData = JSON.parse(jsonText);
        } catch (e) {
            const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
                parsedData = JSON.parse(jsonMatch[1]);
            } else {
                 return ["診所的營業時間是幾點？", "請問該如何預約？", "第一次看診需要準備什麼？", "診所有健保嗎？"];
            }
        }
        
        if (Array.isArray(parsedData)) {
           return parsedData.filter(q => typeof q === 'string').slice(0, 4);
        }
        
        return ["診所的營業時間是幾點？", "請問該如何預約？", "第一次看診需要準備什麼？", "診所有健保嗎？"];
    } catch (error) {
        console.error("Failed to generate or parse example questions:", error);
        return ["診所的營業時間是幾點？", "請問該如何預約？"];
    }
}


export async function deleteRagStore(ragStoreName: string): Promise<void> {
    if (!ai) throw new Error("Gemini AI not initialized");
    await ai.fileSearchStores.delete({
        name: ragStoreName,
        config: { force: true },
    });
}