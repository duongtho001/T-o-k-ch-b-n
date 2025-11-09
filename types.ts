// From Supabase session
export interface User {
    id: string;
    email: string;
    role?: string; // Add role to user type
}

// For dropdown components
export interface DropdownOption {
    id: string;
    name: string;
}

export interface DropdownGroup {
    name: string;
    options: DropdownOption[];
}

// For Gemini service story generation
export interface StoryGenerationResult {
    storyScript: string;
    characters: string[];
}

// For script generation history
export interface HistoryItem {
    id: string;
    title: string;
    content: string;
    timestamp: number;
    wordCount: number;
    characterCount: number;
}

// For the generation queue
export interface QueueItem {
    id: string;
    prompt: string;
    topicId: string;
    durationInMinutes: number;
    languageId: string;
    status: 'pending' | 'generating' | 'completed' | 'error';
    result?: string;
    errorMessage?: string;
}