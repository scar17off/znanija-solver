import { BaseProvider } from './base';

export class GPT24Provider extends BaseProvider {
    constructor() {
        super();
        this.systemMessage = `Ти бот для надання відповідей на запитання в znanija. 
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

Якщо отримуєш питання з контекстом "Моя відповідь:", не пиши "Відповідь:" на початку, просто дай правильну відповідь.`;
    }

    async getAnswer(prompt, onStream, images = [], model = 'gpt-4o') {
        const messages = [
            {
                role: "system",
                content: this.systemMessage
            }
        ];

        // Add images to the messages if they exist
        if (images && images.length > 0) {
            const imageContents = images.map(imageUrl => ({
                type: "image_url",
                image_url: {
                    url: imageUrl
                }
            }));

            messages.push({
                role: "user",
                content: imageContents
            });
        }

        // Add the text prompt
        messages.push({
            role: "user",
            content: prompt
        });

        const response = await fetch('https://gpt24-ecru.vercel.app/api/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({
                messages: messages,
                stream: true,
                model: model, // Use the provided model parameter
                temperature: 0.7,
                presence_penalty: 0,
                frequency_penalty: 0,
                top_p: 1
            })
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
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    
                    try {
                        const json = JSON.parse(data);
                        if (json.choices[0].delta.content) {
                            const chunk = json.choices[0].delta.content;
                            fullText += chunk;
                            if (onStream) {
                                onStream(fullText);
                            }
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
        }

        return fullText;
    }
} 