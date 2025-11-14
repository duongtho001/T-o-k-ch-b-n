import type { DropdownGroup } from './types';

export const TOPICS = [
    { id: 'short_story', name: 'Truyện ngắn', prompt: 'Gợi ý một đoạn mở đầu truyện ngắn, một đoạn về một sự kiện bí ẩn.' },
    { id: 'fun_fact', name: 'Sự thật thú vị', prompt: 'Gợi ý một sự thật thú vị và bất ngờ về khoa học hoặc tự nhiên trong một đoạn văn ngắn.' },
    { id: 'quote', name: 'Trích dẫn', prompt: 'Gợi ý một câu trích dẫn nổi tiếng truyền cảm hứng và mô tả ngắn gọn về người nói câu đó.' },
    { id: 'poem', name: 'Thơ', prompt: 'Gợi ý một bài thơ ngắn bốn câu về sự thay đổi của các mùa.' },
    { id: 'education', name: 'Giáo dục', prompt: 'Giải thích một khái niệm khoa học phức tạp (ví dụ: quang hợp) một cách đơn giản trong một đoạn văn ngắn.' },
    { id: 'meditation', name: 'Thiền', prompt: 'Viết một kịch bản thiền định ngắn, có hướng dẫn tập trung vào hơi thở và sự thư giãn.' },
    { id: 'product', name: 'Sản phẩm', prompt: 'Viết một đoạn mô tả sản phẩm hấp dẫn cho một chiếc đồng hồ thông minh mới.' },
    { id: 'email', name: 'Thư nháp', prompt: 'Soạn một email chuyên nghiệp ngắn gọn để theo dõi sau một cuộc họp kinh doanh.' },
    { id: 'horror', name: 'Kinh dị', prompt: 'Viết một đoạn mở đầu cho một câu chuyện kinh dị, tạo ra không khí căng thẳng và đáng sợ.' },
    { id: 'ghost_story', name: 'Truyện ma', prompt: 'Viết một câu chuyện ma rùng rợn về một bóng ma ám ảnh một gia đình trong ngôi nhà mới của họ.' },
    { id: 'war', name: 'Chiến tranh', prompt: 'Viết một đoạn văn ngắn mô tả một cảnh trong chiến tranh, tập trung vào cảm xúc của một người lính.' },
    { id: 'thriller', name: 'Mặt trái sự thật', prompt: 'Viết một đoạn văn ngắn về một thuyết âm mưu hoặc một sự thật bị che giấu, tạo cảm giác bí ẩn và hồi hộp.' },
    { id: 'fantasy', name: 'Giả tưởng', prompt: 'Viết một đoạn văn mô tả một thành phố thần tiên ẩn trong khu rừng cổ thụ.' },
    { id: 'sci-fi', name: 'Khoa học viễn tưởng', prompt: 'Viết đoạn mở đầu cho một câu chuyện về một phi hành gia phát hiện ra một tín hiệu lạ từ một hành tinh xa xôi.' },
    { id: 'mystery', name: 'Bí ẩn', prompt: 'Viết một đoạn văn giới thiệu một vụ án bí ẩn mà một thám tử tài ba phải giải quyết.' },
    { id: 'drama', name: 'Kịch', prompt: 'Viết một đoạn độc thoại kịch tính ngắn từ một vở kịch, trong đó nhân vật phải đối mặt với một quyết định thay đổi cuộc đời.' },
    { id: 'animal_world', name: 'Thế giới động vật', prompt: 'Viết một đoạn văn ngắn mô tả cuộc sống của một loài động vật hoang dã trong môi trường tự nhiên của nó.' },
    { id: 'spiritual_story', name: 'Câu chuyện tâm linh', prompt: 'Viết một câu chuyện ngắn về một trải nghiệm tâm linh hoặc một bài học cuộc sống sâu sắc.' },
    { id: 'fairy_tale', name: 'Cổ tích', prompt: 'Viết phần mở đầu của một câu chuyện cổ tích, giới thiệu một vương quốc huyền diệu và một nhân vật chính đặc biệt.' },
    { id: 'news', name: 'Thời sự / Tin tức', prompt: 'Gợi ý một bản tóm tắt ngắn gọn về một sự kiện thời sự gần đây.' },
];

export const LANGUAGE_GROUP: DropdownGroup[] = [
    {
        name: 'Ngôn ngữ có sẵn',
        options: [
            { id: 'pt-PT', name: 'Bồ Đào Nha' },
            { id: 'en-US', name: 'Tiếng Anh (Mỹ)' },
            { id: 'ko-KR', name: 'Tiếng Hàn' },
            { id: 'ja-JP', name: 'Tiếng Nhật' },
            { id: 'fr-FR', name: 'Tiếng Pháp' },
            { id: 'es-ES', name: 'Tiếng Tây Ban Nha' },
            { id: 'vi-VN', name: 'Tiếng Việt' },
        ]
    }
];