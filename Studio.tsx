import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { generateTextSuggestion, generateStructuredStory, ApiKeyError, getApiKeys, setApiKeys } from './services/geminiService';
import { TOPICS, LANGUAGE_GROUP } from './constants';
import { LoadingSpinner, SparklesIcon, BookIcon, LightbulbIcon, QuoteIcon, FeatherIcon, MortarBoardIcon, ProductIcon, MailIcon, LeafIcon, GhostIcon, ShieldIcon, MaskIcon, DragonIcon, RocketIcon, MagnifyingGlassIcon, TheaterMasksIcon, CopyIcon, FileTextIcon, KeyIcon, UploadIcon, PlusIcon, ClockIcon, TrashIcon, DownloadIcon, CheckCircleIcon, ExclamationIcon, HeartIcon, RefreshIcon, SettingsIcon, NewspaperIcon } from './components/Icons';
import SearchableDropdown from './components/SearchableDropdown';
import { playSound } from './utils/soundUtils';
import { CLICK_SOUND, GENERATE_START_SOUND, SUCCESS_SOUND } from './assets/sounds';
import { HistoryItem, QueueItem } from './types';


const TopicIcon: React.FC<{ topicId: string, className?: string }> = ({ topicId, className = "mx-auto h-6 w-6 mb-2 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" }) => {
    switch (topicId) {
        case 'short_story': return <BookIcon className={className} />;
        case 'fun_fact': return <LightbulbIcon className={className} />;
        case 'quote': return <QuoteIcon className={className} />;
        case 'poem': return <FeatherIcon className={className} />;
        case 'education': return <MortarBoardIcon className={className} />;
        case 'meditation': return <LeafIcon className={className} />;
        case 'product': return <ProductIcon className={className} />;
        case 'email': return <MailIcon className={className} />;
        case 'horror':
        case 'ghost_story':
            return <GhostIcon className={className} />;
        case 'war': return <ShieldIcon className={className} />;
        case 'thriller': return <MaskIcon className={className} />;
        case 'fantasy': return <DragonIcon className={className} />;
        case 'sci-fi': return <RocketIcon className={className} />;
        case 'mystery': return <MagnifyingGlassIcon className={className} />;
        case 'drama': return <TheaterMasksIcon className={className} />;
        case 'animal_world': return <LeafIcon className={className} />;
        case 'spiritual_story': return <HeartIcon className={className} />;
        case 'fairy_tale': return <SparklesIcon className={className} />;
        case 'news': return <NewspaperIcon className={className} />;
        default: return null;
    }
};

const Studio: React.FC = () => {
    const [text, setText] = useState<string>('Xin chào! Chào mừng đến với Studio Kịch bản AI. Gõ hoặc tạo văn bản ở đây để bắt đầu.');
    const [selectedTopic, setSelectedTopic] = useState<string>(TOPICS[0].id);
    const [customPrompt, setCustomPrompt] = useState<string>('');
    const [durationInMinutes, setDurationInMinutes] = useState<number>(1);
    const [outputLanguage, setOutputLanguage] = useState<string>(LANGUAGE_GROUP[0].options[0].id);
    const [isLoadingText, setIsLoadingText] = useState<boolean>(false);
    const [isPristine, setIsPristine] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [areSoundsEnabled, setAreSoundsEnabled] = useState<boolean>(true);
    const [isDialogueMode, setIsDialogueMode] = useState<boolean>(false);
    const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
    const [apiKeysText, setApiKeysText] = useState('');
    const [history, setHistory] = useState<HistoryItem[]>([]);
    
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isStoppingQueue = useRef(false);

    // State for Generation Queue
    const [generationQueue, setGenerationQueue] = useState<QueueItem[]>([]);
    const [queuePrompt, setQueuePrompt] = useState<string>('');
    const [queueTopicId, setQueueTopicId] = useState<string>(TOPICS[0].id);
    const [queueDurationInMinutes, setQueueDurationInMinutes] = useState<number>(1);
    const [queueLanguageId, setQueueLanguageId] = useState<string>(LANGUAGE_GROUP[0].options[0].id);
    const [isQueueRunning, setIsQueueRunning] = useState<boolean>(false);


    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('script-history');
            if (storedHistory) {
                setHistory(JSON.parse(storedHistory));
            }
        } catch (e) {
            console.error("Failed to load history from localStorage", e);
            setHistory([]);
        }
    }, []);


    const wordCount = useMemo(() => {
        const trimmedText = text.trim();
        if (trimmedText === '') return 0;
        return trimmedText.split(/\s+/).length;
    }, [text]);

    const saveToHistory = (content: string, baseName: string) => {
         const trimmedContent = content.trim();
         const newWordCount = trimmedContent === '' ? 0 : trimmedContent.split(/\s+/).length;
         const newCharacterCount = content.length;

         const newHistoryItem: HistoryItem = {
            id: new Date().toISOString() + Math.random(),
            title: baseName,
            content: content,
            timestamp: Date.now(),
            wordCount: newWordCount,
            characterCount: newCharacterCount,
        };

        setHistory(prevHistory => {
            const updatedHistory = [newHistoryItem, ...prevHistory].slice(0, 50); // Keep max 50 items
            localStorage.setItem('script-history', JSON.stringify(updatedHistory));
            return updatedHistory;
        });
    }

    const openApiSettings = () => {
        playSound(CLICK_SOUND, areSoundsEnabled);
        setApiKeysText(getApiKeys().join('\n'));
        setIsApiSettingsOpen(true);
    }
    
    const handleGenerateIdea = useCallback(async (isRegenerating = false) => {
        playSound(GENERATE_START_SOUND, areSoundsEnabled);
        setIsLoadingText(true);
        setError(null);

        const customText = customPrompt.trim();
        const topic = TOPICS.find(t => t.id === selectedTopic);

        if (!customText && !topic) {
            setError("Vui lòng chọn một chủ đề, nhập mô tả, hoặc tải lên một tệp.");
            setIsLoadingText(false);
            return;
        }

        let basePrompt = '';
        let isStoryTopic = false;
        
        const STORY_TOPIC_IDS = ['short_story', 'horror', 'ghost_story', 'war', 'fantasy', 'sci-fi', 'mystery', 'drama', 'animal_world', 'spiritual_story', 'fairy_tale'];

        if (customText && topic) {
            basePrompt = `Kịch bản nên theo phong cách của một "${topic.name}". Sử dụng mô tả sau làm nguồn cảm hứng chính: "${customText}". Hãy mở rộng ý tưởng này nhưng giữ lại chủ đề cốt lõi. Gợi ý ban đầu cho chủ đề là: "${topic.prompt}".`;
            isStoryTopic = STORY_TOPIC_IDS.includes(topic.id);
        } else if (customText) {
            basePrompt = `Sử dụng văn bản sau đây làm nguồn cảm hứng chính cho một kịch bản mới, hoàn chỉnh: "${customText}". Hãy phân tích chủ đề và phong cách của nó.`;
            const storyKeywords = ['story', 'character', 'plot', 'scene', 'dialogue', 'truyện', 'nhân vật', 'kịch bản'];
            isStoryTopic = storyKeywords.some(kw => customText.toLowerCase().includes(kw));
        } else if (topic) {
            basePrompt = `Kịch bản nên theo phong cách của một "${topic.name}". Gợi ý cụ thể cho chủ đề này là: "${topic.prompt}".`;
            isStoryTopic = STORY_TOPIC_IDS.includes(topic.id);
        }

        if (isRegenerating) {
            basePrompt = `Tạo một phiên bản sáng tạo khác dựa trên gợi ý này. Giữ nguyên chủ đề, độ dài và ngôn ngữ, nhưng thay đổi câu chuyện hoặc cách diễn đạt. Gợi ý gốc là:\n\n${basePrompt}`;
        }

        try {
            const languageName = LANGUAGE_GROUP.flatMap(g => g.options).find(o => o.id === outputLanguage)?.name || 'Vietnamese';
            const targetWordCount = Math.round(Math.max(1, durationInMinutes) * 240); // 240 words per minute

            let newContent: string;
            if (isDialogueMode && isStoryTopic) {
                const result = await generateStructuredStory(basePrompt, languageName, targetWordCount);
                setText(result.storyScript);
                newContent = result.storyScript;
            } else {
                const systemInstruction = `Bạn là một nhà viết kịch bản sáng tạo. Nhiệm vụ của bạn là viết một kịch bản mạch lạc, hấp dẫn và được chế tác đặc biệt để tường thuật bằng giọng nói. Ngôn ngữ phải rõ ràng, nghe tự nhiên và dễ nói. Câu chuyện phải diễn ra một cách logic.`;

                const finalPrompt = `
                ${basePrompt}

                ---
                **YÊU CẦU KỊCH BẢN:**
                1.  **Ngôn ngữ:** Toàn bộ kịch bản phải được viết bằng ${languageName}.
                2.  **Độ dài:** Kịch bản phải có chính xác ${targetWordCount} từ. Việc tuân thủ nghiêm ngặt số lượng từ này là rất quan trọng để đáp ứng yêu cầu về thời lượng.
                3.  **Định dạng:** Chia kịch bản thành các đoạn văn hoặc cảnh nếu phù hợp với câu chuyện. Sử dụng dấu ngắt dòng kép để phân tách chúng. Không thêm tiêu đề hoặc nhãn như "Cảnh 1".
                4.  **Rõ ràng cho Lồng tiếng:** Sử dụng ngôn ngữ và cấu trúc câu rõ ràng, dễ đọc to. Tránh từ vựng quá phức tạp hoặc câu văn rắc rối.
                `;
                const idea = await generateTextSuggestion(finalPrompt, systemInstruction);
                setText(idea);
                newContent = idea;
            }

            const baseName = customPrompt.trim().split(/\s+/).slice(0, 5).join(' ') 
                || TOPICS.find(t => t.id === selectedTopic)?.name 
                || uploadedFileName?.replace(/\.txt$/, '')
                || 'Untitled Script';
            
            saveToHistory(newContent, baseName);

            setIsPristine(false);
            playSound(SUCCESS_SOUND, areSoundsEnabled);
        } catch (err) {
            if (err instanceof ApiKeyError) {
                setError(err.message);
                openApiSettings();
            } else {
                setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định khi tạo văn bản.');
            }
        } finally {
            setIsLoadingText(false);
        }
    }, [selectedTopic, customPrompt, durationInMinutes, areSoundsEnabled, outputLanguage, isDialogueMode, uploadedFileName]);
    
    const handleSaveApiKeys = () => {
        playSound(CLICK_SOUND, areSoundsEnabled);
        const keys = apiKeysText
            .split('\n')
            .map(k => k.trim())
            .filter(k => k.length > 0);
        
        if (keys.length === 0) {
            setError("Vui lòng nhập ít nhất một khóa API.");
            return;
        }

        setApiKeys(keys);
        setIsApiSettingsOpen(false);
        setError(null);
        // User can now retry the failed action manually.
    };

    const handleTopicSelect = (topicId: string) => {
        setSelectedTopic(topicId);
        playSound(CLICK_SOUND, areSoundsEnabled);
    };
    
    const handleCustomPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCustomPrompt(e.target.value);
    };

     const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                setCustomPrompt(content);
                setUploadedFileName(file.name);
                playSound(SUCCESS_SOUND, areSoundsEnabled);
            };
            reader.onerror = () => {
                setError("Không thể đọc tệp.");
            };
            reader.readAsText(file);
        } else if (file) {
            setError("Vui lòng chỉ tải lên tệp .txt.");
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClearFile = () => {
        setUploadedFileName(null);
        setCustomPrompt('');
        playSound(CLICK_SOUND, areSoundsEnabled);
    };

    const handleCopyText = useCallback(async () => {
        if (!text.trim()) return;
        try {
            await navigator.clipboard.writeText(text);
            playSound(CLICK_SOUND, areSoundsEnabled);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            setError('Không thể sao chép văn bản vào clipboard.');
        }
    }, [text, areSoundsEnabled]);

    const createSafeFilename = (name: string): string => {
        if (!name) return 'ai-script';
        return name
            .toLowerCase()
            .trim()
            .slice(0, 50)
            .replace(/\.txt$/, '') // Remove .txt extension if present
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleDownloadText = useCallback(() => {
        if (!text.trim()) return;
        
        let baseName = 'ai-script';
        if (uploadedFileName) {
            baseName = uploadedFileName;
        } else if (customPrompt.trim()) {
            baseName = customPrompt.trim();
        } else if (selectedTopic) {
            const topic = TOPICS.find(t => t.id === selectedTopic);
            if (topic) {
                baseName = topic.name;
            }
        } else if (!isPristine) {
            baseName = text.trim().split(/\s+/).slice(0, 5).join(' ');
        }

        const filename = createSafeFilename(baseName);
        handleDownloadHistoryItem(text, filename);

    }, [text, areSoundsEnabled, customPrompt, selectedTopic, isPristine, uploadedFileName]);

    const handleDownloadHistoryItem = useCallback((content: string, title: string) => {
        if (!content.trim()) return;
        playSound(CLICK_SOUND, areSoundsEnabled);
        const filename = createSafeFilename(title);
        try {
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename || 'ai-script'}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download text: ', err);
            setError('Không thể tải xuống tệp văn bản.');
        }
    }, [areSoundsEnabled]);
    
    const handleNewScript = () => {
        playSound(CLICK_SOUND, areSoundsEnabled);
        setText('Xin chào! Chào mừng đến với Studio Kịch bản AI. Gõ hoặc tạo văn bản ở đây để bắt đầu.');
        setSelectedTopic(TOPICS[0].id);
        setCustomPrompt('');
        setDurationInMinutes(1);
        setOutputLanguage(LANGUAGE_GROUP[0].options[0].id);
        setIsPristine(true);
        setError(null);
        setUploadedFileName(null);
        setIsDialogueMode(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleLoadFromHistory = (item: HistoryItem) => {
        playSound(CLICK_SOUND, areSoundsEnabled);
        setText(item.content);
        setCustomPrompt(item.title); // Use history title as the new prompt basis
        setUploadedFileName(null);
        setIsPristine(false);
    };
    
    const handleDeleteHistoryItem = (idToDelete: string) => {
        playSound(CLICK_SOUND, areSoundsEnabled);
        if (window.confirm('Bạn có chắc chắn muốn xóa mục lịch sử này không?')) {
            setHistory(prevHistory => {
                const updatedHistory = prevHistory.filter(item => item.id !== idToDelete);
                localStorage.setItem('script-history', JSON.stringify(updatedHistory));
                return updatedHistory;
            });
        }
    };

    const handleClearHistory = () => {
        playSound(CLICK_SOUND, areSoundsEnabled);
        if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử kịch bản không? Hành động này không thể hoàn tác.')) {
            setHistory([]);
            localStorage.removeItem('script-history');
        }
    };

    // --- Generation Queue Functions ---

    const handleAddToQueue = () => {
        if (!queuePrompt.trim()) return;
        const newItem: QueueItem = {
            id: new Date().toISOString() + Math.random(),
            prompt: queuePrompt,
            topicId: queueTopicId,
            durationInMinutes: queueDurationInMinutes,
            languageId: queueLanguageId,
            status: 'pending',
        };
        setGenerationQueue(prev => [...prev, newItem]);
        setQueuePrompt(''); // Clear input after adding
        setQueueDurationInMinutes(1);
        setQueueLanguageId(LANGUAGE_GROUP[0].options[0].id); // Reset language
        playSound(CLICK_SOUND, areSoundsEnabled);
    };

    const handleRemoveFromQueue = (id: string) => {
        setGenerationQueue(prev => prev.filter(item => item.id !== id));
        playSound(CLICK_SOUND, areSoundsEnabled);
    };

    const handleClearQueue = () => {
        if (generationQueue.length > 0 && window.confirm('Bạn có chắc chắn muốn xóa tất cả các mục trong hàng chờ không? Hành động này sẽ dừng quá trình tạo đang chạy.')) {
            if (isQueueRunning) {
                isStoppingQueue.current = true;
            }
            setGenerationQueue([]);
            playSound(CLICK_SOUND, areSoundsEnabled);
        }
    };

    const handleStartQueueGeneration = async () => {
        isStoppingQueue.current = false;
        setIsQueueRunning(true);
        setError(null);
        playSound(GENERATE_START_SOUND, areSoundsEnabled);

        for (const item of generationQueue) {
             if (isStoppingQueue.current) {
                break;
            }
            if (item.status !== 'pending') continue;

            setGenerationQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'generating' } : q));

            try {
                const topic = TOPICS.find(t => t.id === item.topicId);
                const customText = item.prompt;
                 const basePrompt = `Kịch bản nên theo phong cách của một "${topic?.name || 'chung'}". Sử dụng mô tả sau làm nguồn cảm hứng chính: "${customText}".`;
                const isStoryTopic = ['short_story', 'horror', 'ghost_story', 'war', 'fantasy', 'sci-fi', 'mystery', 'drama'].includes(item.topicId);

                const languageName = LANGUAGE_GROUP.flatMap(g => g.options).find(o => o.id === item.languageId)?.name || 'Vietnamese';
                const targetWordCount = Math.round(Math.max(1, item.durationInMinutes) * 240);
                
                let newContent: string;
                if (isDialogueMode && isStoryTopic) {
                     const result = await generateStructuredStory(basePrompt, languageName, targetWordCount);
                     newContent = result.storyScript;
                } else {
                     const systemInstruction = `Bạn là một nhà viết kịch bản sáng tạo, tạo ra nội dung mạch lạc, hấp dẫn để tường thuật bằng giọng nói.`;
                     const finalPrompt = `${basePrompt}\n\n**YÊU CẦU:**\n- Ngôn ngữ: ${languageName}\n- Độ dài: Chính xác ${targetWordCount} từ.\n- Định dạng: Các đoạn văn rõ ràng, không có tiêu đề.`;
                     newContent = await generateTextSuggestion(finalPrompt, systemInstruction);
                }

                const baseName = item.prompt.trim().split(/\s+/).slice(0, 5).join(' ') || topic?.name || 'Queued Script';
                saveToHistory(newContent, baseName);
                setText(newContent); // Show the latest generated script in the editor

                setGenerationQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'completed', result: newContent } : q));
                playSound(SUCCESS_SOUND, areSoundsEnabled);

            } catch (err: any) {
                console.error(`Lỗi khi tạo mục hàng chờ ${item.id}:`, err);
                const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định.';
                setGenerationQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', errorMessage } : q));
                if (err instanceof ApiKeyError) {
                    setError(err.message);
                    openApiSettings();
                    setIsQueueRunning(false); // Stop the queue on API key error
                    return; // Exit the loop
                }
            }
        }

        isStoppingQueue.current = false;
        setIsQueueRunning(false);
    };

    const QueueStatusIcon: React.FC<{ status: QueueItem['status'] }> = ({ status }) => {
        switch (status) {
            case 'pending':
                return <ClockIcon className="h-4 w-4 text-gray-500" title="Đang chờ" />;
            case 'generating':
                return <LoadingSpinner className="animate-spin h-4 w-4 text-indigo-500" title="Đang tạo..." />;
            case 'completed':
                return <CheckCircleIcon className="h-4 w-4 text-green-500" title="Hoàn thành" />;
            case 'error':
                return <ExclamationIcon className="h-4 w-4 text-red-500" title="Lỗi" />;
            default:
                return null;
        }
    };
    
    const formatTimeAgo = (timestamp: number) => {
        const now = new Date();
        const seconds = Math.floor((now.getTime() - timestamp) / 1000);
        if (seconds < 10) return "Vừa xong";
        if (seconds < 60) return `${seconds} giây trước`;
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} phút trước`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ trước`;

        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} ngày trước`;

        const months = Math.floor(days / 30);
        if (months < 12) return `${months} tháng trước`;
        
        const years = Math.floor(days / 365);
        return `${years} năm trước`;
    };


    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-300">
            {isApiSettingsOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex items-center justify-center p-4" aria-modal="true" role="dialog">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md relative border dark:border-gray-600">
                        <div className="flex items-start">
                             <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 sm:mx-0 sm:h-10 sm:w-10">
                                <KeyIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-grow">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                    Cài đặt Khóa API
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {error || "Nhập các khóa API của bạn, mỗi khóa trên một dòng. Ứng dụng sẽ tự động sử dụng khóa tiếp theo khi khóa hiện tại hết hạn ngạch."}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label htmlFor="api-keys-textarea" className="sr-only">Khóa API (một khóa mỗi dòng)</label>
                            <textarea
                                id="api-keys-textarea"
                                value={apiKeysText}
                                onChange={(e) => setApiKeysText(e.target.value)}
                                placeholder="dán khóa của bạn vào đây...&#10;dán một khóa khác vào đây..."
                                rows={5}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                            />
                        </div>
                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                            <button
                                type="button"
                                onClick={handleSaveApiKeys}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                Lưu Khóa
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsApiSettingsOpen(false);
                                    setError(null);
                                }}
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="w-full max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col xl:flex-row border border-gray-200 dark:border-gray-700">
                <aside className="w-full xl:w-1/3 xl:max-w-md bg-gray-50 dark:bg-gray-800/50 p-6 lg:p-8 border-b xl:border-b-0 xl:border-r border-gray-200 dark:border-gray-700 flex flex-col space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Studio Kịch bản AI</h1>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">Tạo kịch bản và câu chuyện độc đáo.</p>
                        </div>
                         <button onClick={openApiSettings} title="Cài đặt Khóa API" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <SettingsIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="space-y-6 flex-grow overflow-y-auto -mr-4 pr-4">
                        <section className="space-y-3 p-4 bg-gray-100 dark:bg-gray-700/40 rounded-lg border dark:border-gray-600">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tạo Nội dung Đơn</h2>
                                <button onClick={handleNewScript} title="Bắt đầu một kịch bản mới" className="group flex items-center text-sm font-medium px-2 py-1 rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <PlusIcon className="w-4 h-4 mr-1 text-indigo-500 group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-200" />
                                    <span>Kịch bản mới</span>
                                </button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Gợi ý chủ đề
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {TOPICS.map((topic) => (
                                        <button key={topic.id} type="button" onClick={() => handleTopicSelect(topic.id)} className={`group p-2 rounded-lg text-center border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-700/40 focus:ring-indigo-500 ${selectedTopic === topic.id ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500 dark:border-indigo-600 shadow-sm' : 'bg-white dark:bg-gray-900/30 border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20'}`}>
                                            <TopicIcon topicId={topic.id} className="mx-auto h-5 w-5 mb-1 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"/>
                                            <span className={`block text-xs font-semibold transition-colors ${selectedTopic === topic.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300'}`}>{topic.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                             <div className="pt-2">
                                <label htmlFor="custom-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Hoặc mô tả / Nội dung gốc
                                </label>
                                <textarea id="custom-prompt" rows={3} value={customPrompt} onChange={handleCustomPromptChange} placeholder="Ví dụ: Viết một câu chuyện kinh dị về một con tàu ma ám..." className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                            </div>
                             <div className="pt-1">
                                <label htmlFor="file-upload" className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                   <UploadIcon className="w-5 h-5 mr-2 -ml-1" />
                                   <span>Tải lên tệp .txt</span>
                                </label>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" ref={fileInputRef} onChange={handleFileUpload} accept=".txt" />
                                {uploadedFileName && (
                                     <div className="mt-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-600/50 rounded p-2">
                                         <span className="truncate">{uploadedFileName}</span>
                                         <button onClick={handleClearFile} className="ml-2 text-red-500 hover:text-red-700 dark:hover:text-red-400">&times;</button>
                                     </div>
                                )}
                            </div>
                        </section>

                        <section className="space-y-4 p-4 bg-gray-100 dark:bg-gray-700/40 rounded-lg border dark:border-gray-600">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tùy chỉnh Chung</h2>
                            <div>
                                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Thời lượng (phút) cho mỗi kịch bản</label>
                                <input id="duration" type="number" min="1" max="30" value={durationInMinutes} onChange={(e) => setDurationInMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-describedby="duration-description"/>
                                <p id="duration-description" className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ước tính khoảng {durationInMinutes * 240} từ (tốc độ nói trung bình).</p>
                            </div>
                            <div>
                                <label id="language-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ngôn ngữ đầu ra</label>
                                <SearchableDropdown labelId="language-label" groups={LANGUAGE_GROUP} value={outputLanguage} onChange={setOutputLanguage} placeholder="Tìm kiếm ngôn ngữ..." allOptions={LANGUAGE_GROUP.flatMap(g => g.options)} areSoundsEnabled={areSoundsEnabled} />
                            </div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="dialogue-mode-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">Kịch bản 2 nhân vật</label>
                                <button role="switch" aria-checked={isDialogueMode} id="dialogue-mode-toggle" onClick={() => setIsDialogueMode(!isDialogueMode)} className={`${isDialogueMode ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800`}>
                                    <span className={`${isDialogueMode ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                                </button>
                            </div>
                        </section>

                        <section className="space-y-3 p-4 bg-gray-100 dark:bg-gray-700/40 rounded-lg border dark:border-gray-600">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                                    <ClockIcon className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400"/>
                                    Lịch sử
                                </h2>
                                {history.length > 0 && (
                                    <button onClick={handleClearHistory} className="p-1 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50" title="Xóa toàn bộ lịch sử">
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                )}
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-2 -mr-2 pr-2">
                                {history.length > 0 ? (
                                    history.map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-900/30 rounded-md shadow-sm border border-gray-200 dark:border-gray-600/50">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={item.title}>{item.title}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatTimeAgo(item.timestamp)}
                                                    {(item.wordCount !== undefined && item.characterCount !== undefined) && (
                                                        <>
                                                            <span className="mx-1.5 text-gray-300 dark:text-gray-600">|</span>
                                                            {item.wordCount} từ
                                                            <span className="mx-1.5 text-gray-300 dark:text-gray-600">|</span>
                                                            {item.characterCount} ký tự
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center flex-shrink-0 ml-2 space-x-1">
                                                 <button onClick={() => handleLoadFromHistory(item)} className="px-2 py-1 text-xs font-semibold rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:text-indigo-200 dark:bg-indigo-900/60 dark:hover:bg-indigo-900" title="Tải kịch bản này vào trình biên tập">
                                                    Tải vào Editor
                                                </button>
                                                <button onClick={() => handleDownloadHistoryItem(item.content, item.title)} className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" title="Tải xuống">
                                                    <DownloadIcon className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDeleteHistoryItem(item.id)} className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400" title="Xóa">
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 italic py-4">Chưa có kịch bản nào được tạo.</p>
                                )}
                            </div>
                        </section>
                    </div>
                </aside>

                <main className="w-full xl:w-2/3 p-6 lg:p-8 flex flex-col xl:grid xl:grid-rows-2 xl:gap-6">
                    <div className="flex-grow flex flex-col min-h-0">
                         <div className="flex justify-between items-center mb-4">
                            <label htmlFor="text-input" className="block text-lg font-semibold text-gray-800 dark:text-gray-200">Trình biên tập Kịch bản</label>
                             <div className="flex items-center space-x-2">
                                {isDialogueMode && (
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-1 rounded">
                                        Sử dụng định dạng: <strong>Tên vai: Lời thoại...</strong>
                                    </p>
                                )}
                                <button onClick={handleCopyText} title="Sao chép văn bản" disabled={!text.trim()} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition">
                                    <CopyIcon />
                                </button>
                                <button onClick={handleDownloadText} title="Tải xuống dưới dạng .txt" disabled={!text.trim()} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition">
                                    <FileTextIcon />
                                </button>
                                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                                <button onClick={() => handleGenerateIdea(true)} disabled={isLoadingText || isPristine || isQueueRunning} className="flex items-center justify-center text-sm font-medium py-2 px-4 rounded-lg text-indigo-700 dark:text-indigo-300 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    <RefreshIcon className="mr-2 h-4 w-4"/>
                                    Tạo lại
                                </button>
                                <button onClick={() => handleGenerateIdea()} disabled={isLoadingText || isQueueRunning || (!selectedTopic && !customPrompt.trim() && !uploadedFileName)} className="flex items-center justify-center text-sm font-medium py-2 px-4 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                                    {isLoadingText ? <LoadingSpinner className="mr-2 h-4 w-4 text-white"/> : <SparklesIcon className="mr-2 h-5 w-5"/>}
                                    {isLoadingText ? 'Đang tạo...' : 'Tạo Kịch bản'}
                                </button>
                            </div>
                        </div>
                        <textarea
                            id="text-input"
                            value={text}
                            onChange={(e) => {
                              setText(e.target.value);
                              setIsPristine(false);
                            }}
                            placeholder="Nhập văn bản tại đây..."
                            className={`flex-grow w-full p-4 border rounded-lg shadow-inner resize-none bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-lg leading-relaxed ${isPristine ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'} border-gray-300 dark:border-gray-600`}
                        />
                         <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-2 pr-1">
                            <span>{wordCount} từ</span>
                            <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                            <span>{text.length} ký tự</span>
                        </div>
                    </div>
                    
                    <section className="mt-6 xl:mt-0 flex flex-col min-h-0">
                       {error && !isApiSettingsOpen && <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                       <div className="flex-grow flex flex-col p-4 bg-gray-100 dark:bg-gray-700/40 rounded-lg border dark:border-gray-600">
                           <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Hàng chờ Tạo Kịch bản</h2>
                            <div className="space-y-3">
                                <textarea value={queuePrompt} onChange={(e) => setQueuePrompt(e.target.value)} placeholder="Nhập mô tả kịch bản..." rows={2} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div className="md:col-span-1">
                                        <label id="queue-topic-label" className="sr-only">Chủ đề</label>
                                        <SearchableDropdown labelId="queue-topic-label" groups={[{ name: 'Chủ đề', options: TOPICS }]} value={queueTopicId} onChange={setQueueTopicId} placeholder="Chọn chủ đề..." allOptions={TOPICS} areSoundsEnabled={areSoundsEnabled}/>
                                    </div>
                                    <div className="md:col-span-1">
                                        <label id="queue-language-label" className="sr-only">Ngôn ngữ</label>
                                        <SearchableDropdown labelId="queue-language-label" groups={LANGUAGE_GROUP} value={queueLanguageId} onChange={setQueueLanguageId} placeholder="Chọn ngôn ngữ..." allOptions={LANGUAGE_GROUP.flatMap(g => g.options)} areSoundsEnabled={areSoundsEnabled} />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label htmlFor="queue-duration" className="sr-only">Thời lượng (phút)</label>
                                        <input
                                            id="queue-duration"
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={queueDurationInMinutes}
                                            onChange={(e) => setQueueDurationInMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                            className="w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            title="Thời lượng (phút)"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <button onClick={handleAddToQueue} disabled={!queuePrompt.trim() || isQueueRunning} className="w-full h-full flex items-center justify-center text-sm font-medium py-2 px-4 rounded-lg text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                            <PlusIcon className="w-4 h-4 mr-2"/> Thêm vào hàng chờ
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex-grow overflow-y-auto space-y-2 pr-2 -mr-2">
                                {generationQueue.length > 0 ? generationQueue.map(item => (
                                    <div key={item.id} className="flex items-center p-2 bg-white dark:bg-gray-900/30 rounded-md shadow-sm border border-gray-200 dark:border-gray-600/50">
                                        <div className="mr-3 flex-shrink-0">
                                            <QueueStatusIcon status={item.status} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={item.prompt}>{item.prompt}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {TOPICS.find(t => t.id === item.topicId)?.name || 'Không có'}
                                                <span className="mx-1.5 text-gray-300 dark:text-gray-600">|</span>
                                                {item.durationInMinutes} phút
                                                <span className="mx-1.5 text-gray-300 dark:text-gray-600">|</span>
                                                {LANGUAGE_GROUP.flatMap(g => g.options).find(o => o.id === item.languageId)?.name || 'Không có'}
                                            </p>
                                            {item.status === 'error' && <p className="text-xs text-red-500 truncate" title={item.errorMessage}>{item.errorMessage}</p>}
                                        </div>
                                        <button onClick={() => handleRemoveFromQueue(item.id)} disabled={isQueueRunning} className="ml-2 flex-shrink-0 p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" title="Xóa">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                )) : <p className="text-sm text-center text-gray-500 dark:text-gray-400 italic py-4">Hàng chờ trống.</p>}
                            </div>
                            <div className="mt-4 flex justify-end space-x-2">
                                <button onClick={handleClearQueue} disabled={generationQueue.length === 0} className="text-sm font-medium py-2 px-4 rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">Xóa hàng chờ</button>
                                <button onClick={handleStartQueueGeneration} disabled={generationQueue.filter(i => i.status === 'pending').length === 0 || isQueueRunning} className="flex items-center justify-center text-sm font-medium py-2 px-4 rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isQueueRunning ? <><LoadingSpinner className="mr-2 h-4 w-4 text-white"/> Đang chạy...</> : <>▶ Bắt đầu tạo hàng chờ</>}
                                </button>
                            </div>
                       </div>
                    </section>
                </main>
            </div>
            <footer className="text-center mt-6 text-xs text-gray-500 dark:text-gray-400">
                <p>Cung cấp bởi Google Gemini API.</p>
            </footer>
        </div>
    );
};

export default Studio;