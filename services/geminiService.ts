import { GoogleGenAI, Type } from "@google/genai";
import { StoryGenerationResult } from "../types";

// Lớp lỗi tùy chỉnh cho các vấn đề về khóa API/hạn ngạch
export class ApiKeyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ApiKeyError';
    }
}

const API_KEYS_STORAGE_KEY = 'api-key-list';
const ACTIVE_API_KEY_INDEX_KEY = 'active-api-key-index';

// --- Quản lý Khóa API ---

/**
 * Lấy danh sách các khóa API từ localStorage.
 * @returns {string[]} Mảng các khóa API.
 */
export const getApiKeys = (): string[] => {
    try {
        const storedKeys = typeof window !== 'undefined' ? localStorage.getItem(API_KEYS_STORAGE_KEY) : '[]';
        const keys = storedKeys ? JSON.parse(storedKeys) : [];
        return Array.isArray(keys) ? keys : [];
    } catch (e) {
        return [];
    }
};

/**
 * Lưu danh sách các khóa API vào localStorage và đặt lại chỉ mục hoạt động.
 * @param {string[]} keys Mảng các khóa API để lưu.
 */
export const setApiKeys = (keys: string[]): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
        localStorage.setItem(ACTIVE_API_KEY_INDEX_KEY, '0'); // Reset index when keys are updated
    }
};

/**
 * Lấy chỉ mục của khóa API đang hoạt động.
 * @returns {number} Chỉ mục hiện tại.
 */
const getActiveApiKeyIndex = (): number => {
    const index = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_API_KEY_INDEX_KEY) : '0';
    return parseInt(index || '0', 10);
};

/**
 * Đặt chỉ mục của khóa API đang hoạt động.
 * @param {number} index Chỉ mục mới để đặt.
 */
const setActiveApiKeyIndex = (index: number): void => {
     if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_API_KEY_INDEX_KEY, index.toString());
     }
};


// Lấy khóa API đang hoạt động.
const getApiKey = (): string => {
    const keys = getApiKeys();
    if (keys.length === 0) {
        throw new ApiKeyError("Không có khóa API nào được định cấu hình. Vui lòng thêm một khóa trong cài đặt.");
    }
    const index = getActiveApiKeyIndex();
    // Handle index out of bounds just in case
    if (index >= keys.length) {
        setActiveApiKeyIndex(0);
        return keys[0];
    }
    return keys[index];
};

// Tạo một instance client AI mới với khóa hiện tại.
const getAiClient = () => {
    // This function now throws ApiKeyError if no key is configured,
    // which will be caught by the calling function.
    return new GoogleGenAI({ apiKey: getApiKey() });
};

/**
 * Helper function to robustly extract a lowercased error message string from various error formats.
 * @param error The error object.
 * @returns A lowercased string representation of the error.
 */
function getErrorMessage(error: any): string {
    if (typeof error === 'string') {
        return error.toLowerCase();
    }
    if (error && typeof error.message === 'string') {
        return error.message.toLowerCase();
    }
    try {
        return JSON.stringify(error).toLowerCase();
    } catch {
        return 'lỗi không xác định'.toLowerCase();
    }
}

async function executeApiCall<T>(
    apiLogic: (ai: GoogleGenAI) => Promise<T>,
    defaultErrorMessage: string
): Promise<T> {
    const keys = getApiKeys();
    if (keys.length === 0) {
        throw new ApiKeyError("Không có khóa API nào được định cấu hình. Vui lòng thêm một khóa trong cài đặt.");
    }

    let currentIndex = getActiveApiKeyIndex();

    for (let i = 0; i < keys.length; i++) {
        const keyIndexToTry = (currentIndex + i) % keys.length;
        setActiveApiKeyIndex(keyIndexToTry);

        try {
            const ai = getAiClient(); // Will use the key at `keyIndexToTry`
            const result = await apiLogic(ai);
            return result; // Success, exit the loop
        } catch (error: any) {
            const errorMessage = getErrorMessage(error);
            const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('resource_exhausted');
            const isInvalidKeyError = ['api key not valid', 'permission denied', 'not found', 'invalid api key', 'api key is not configured'].some(k => errorMessage.includes(k));

            if (isQuotaError || isInvalidKeyError) {
                console.warn(`Khóa API tại chỉ mục ${keyIndexToTry} không thành công (${isQuotaError ? 'Hết hạn ngạch' : 'Không hợp lệ'}). Đang thử khóa tiếp theo.`);
                // Continue to the next iteration of the loop
                continue;
            } else {
                // For other errors (e.g., server unavailable, bad request), throw immediately.
                console.error("Lỗi API không thể thử lại:", error);
                if (errorMessage.includes('unavailable') || errorMessage.includes('overloaded')) {
                    throw new Error("Mô hình AI hiện đang quá tải. Vui lòng thử lại sau giây lát.");
                }
                throw new Error(defaultErrorMessage);
            }
        }
    }

    // If the loop completes, all keys have failed.
    throw new ApiKeyError("Tất cả các khóa API được cung cấp đều không thành công (hết hạn ngạch hoặc không hợp lệ). Vui lòng thêm khóa mới trong cài đặt.");
}


export async function generateTextSuggestion(prompt: string, systemInstruction?: string): Promise<string> {
    const apiLogic = async (ai: GoogleGenAI) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            ...(systemInstruction && { config: { systemInstruction } }),
        });
        return response.text;
    };
    return executeApiCall(apiLogic, "Không thể lấy gợi ý từ AI. Vui lòng kiểm tra kết nối của bạn và thử lại.");
}

export async function generateStructuredStory(basePrompt: string, languageName: string, targetWordCount: number, isVoiceOptimized: boolean): Promise<StoryGenerationResult> {
    const voiceOptimizationInstruction = isVoiceOptimized
        ? `5. **Tối ưu hóa Giọng nói:** Để làm cho kịch bản trở nên sống động hơn, hãy tích hợp một cách tinh tế các gợi ý về ngữ điệu và cảm xúc vào lời thoại bằng dấu ngoặc đơn. Ví dụ: (cười nhẹ), (thì thầm), (háo hức). Các gợi ý này phải phù hợp với bối cảnh.`
        : '';

    const prompt = `
        Bạn là một nhà văn chuyên viết hội thoại cho các vở kịch audio. Nhiệm vụ của bạn là viết một kịch bản ngắn, hai nhân vật bằng ${languageName} dựa trên gợi ý sau: "${basePrompt}".

        **YÊU CẦU CỰC KỲ QUAN TRỌNG:**
        1.  **Nhân vật:** Câu chuyện phải có chính xác 2 nhân vật riêng biệt.
        2.  **Độ dài:** Kịch bản phải có tổng cộng chính xác ${targetWordCount} từ. Việc tuân thủ nghiêm ngặt số lượng từ này là rất quan trọng.
        3.  **Chất lượng Lồng tiếng:** Lời thoại phải tự nhiên, mạch lạc và dễ cho diễn viên thể hiện. Nó phải nghe giống như một cuộc trò chuyện thật.
        4.  **Định dạng:** Kịch bản phải được định dạng với mỗi dòng bắt đầu bằng tên nhân vật, theo sau là dấu hai chấm và lời thoại của họ (ví dụ: "Tên nhân vật: Lời thoại").
        ${voiceOptimizationInstruction}

        Toàn bộ đầu ra của bạn sẽ là một đối tượng JSON. Cung cấp kịch bản cuối cùng và danh sách tên các nhân vật duy nhất.
    `;
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            storyScript: { type: Type.STRING, description: 'The story script, formatted as "Character: Dialogue".' },
            characters: { type: Type.ARRAY, description: 'A list of all unique character names that appear in the script.', items: { type: Type.STRING } }
        },
        required: ['storyScript', 'characters']
    };
    
    const apiLogic = async (ai: GoogleGenAI) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema },
        });
        const result = JSON.parse(response.text);
        if (!result.storyScript || !Array.isArray(result.characters)) {
            throw new Error("Invalid JSON response from AI.");
        }
        return result as StoryGenerationResult;
    };
    return executeApiCall(apiLogic, "Không thể tạo câu chuyện có cấu trúc từ AI. Vui lòng thử lại.");
}