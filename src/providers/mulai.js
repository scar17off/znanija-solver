import { BaseProvider } from './base';

export class MulaiProvider extends BaseProvider {
    constructor() {
        super();
    }

    async getAnswer(prompt, onStream, images = []) {
        const messages = [
            {
                role: "user",
                content: `Ти бот для надання відповідей на запитання в znanija. 
Відповідай максимально коротко, без форматування та зайвих слів.
Не використовуй списки, зірочки чи інші спеціальні символи.
Не пиши "Відповідь:", "Ось відповідь:" тощо.
Не розбивай текст на пункти.

Для математичних задач та задач з фізики/хімії:
1. Спочатку напиши "Дано:"
2. Потім "Розв'язання:"
3. В кінці "Відповідь:"

Для завдань з категоризації слів:
1. Просто напиши номер категорії і слова через кому
2. Кожну категорію з нового рядка
3. Не додавай пояснень

Для всіх інших типів задач - просто пиши відповідь без додаткових слів.

Приклади:
Питання: Put the words in the correct category: dog cat house apartment bird fish
1. dog, cat
2. house, apartment
3. bird, fish

Питання: Знайти площу трикутника зі сторонами 3, 4 та 5
Дано:
a = 3
b = 4
c = 5

Розв'язання:
p = (a + b + c)/2 = 6
S = √(p(p-a)(p-b)(p-c))
S = √(6(6-3)(6-4)(6-5))
S = √(6·3·2·1) = 6

Відповідь: 6 кв.од.

Питання: What do people hang on their doors during Christmas?
People hang wreaths on their doors during Christmas.

Якщо отримуєш питання з контекстом "Моя відповідь:", не пиши "Відповідь:" на початку, просто дай правильну відповідь.`
            },
            {
                role: "assistant",
                content: "Зрозуміло, готовий допомогти з вашим завданням."
            }
        ];

        // Add the question with images if they exist
        let questionContent = `Завдання: ${prompt}`;
        
        if (images && images.length > 0) {
            // Convert images to base64 if they're not already
            const imagePromises = images.map(async (imageUrl) => {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            });

            const base64Images = await Promise.all(imagePromises);
            questionContent = base64Images.join('\n') + '\n' + questionContent;
        }

        messages.push({
            role: "user",
            content: questionContent
        });

        const corsKey = localStorage.getItem('corsApiKey') || '';
        const response = await fetch('https://proxy.cors.sh/https://mulai.vercel.app/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-cors-api-key': corsKey
            },
            body: JSON.stringify({ messages })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        let fullText = '';
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += new TextDecoder().decode(value);
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('0:"')) {
                    const content = line.slice(3, -1);
                    if (content) {
                        fullText += content;
                        if (onStream) {
                            await onStream(fullText);
                        }
                    }
                }
            }
        }

        fullText = fullText
            .replace(/<[^>]+>/g, '')          // Remove anything between < and >
            .replace(/<<end_of_turn>/g, '')   // Remove <<end_of_turn>> markers
            .replace(/<<\/?end_of_turn>>/g, '') // Remove <<end_of_turn>> and <</end_of_turn>>
            .replace(/\s*<<\/?[^>]+>>/g, '')  // Remove any remaining << >> markers with optional whitespace
            .replace(/\d*<<[^>]+>>/g, '')     // Remove numbers followed by << >> markers
            .replace(/<<[^>]+>>/g, '')        // Remove any remaining << >> markers
            .replace(/\s+/g, ' ')             // Normalize whitespace
            .trim();

        return fullText;
    }
}