import { GPT24Provider } from './providers/gpt24';

(function () {
    "use strict";

    const gpt24 = new GPT24Provider();
    let currentText = '';

    function createAIButton() {
        const buttonHtml = `
    <div style="display: flex; align-items: center; gap: 4px;">
        <div class="OutsideClickController-module__wrapper--3MKCa">
            <div data-testid="tooltip_container" class="Tooltip-module__brn-tooltip-container--za0fg">
                <div role="button" class="Tooltip-module__brn-tooltip-children--Wa25k" tabindex="-1" aria-haspopup="false" aria-expanded="false">
                    <button id="gpt24-answer-button" 
                        data-testid="rich_text_editor_toolbar_gpt24_button" 
                        class="sg-button sg-button--m sg-button--transparent sg-button--icon-only" 
                        aria-label="GPT24 Answer">
                        <span class="sg-button__hover-overlay"></span>
                        <span class="sg-button__icon sg-button__icon--m">
                            <div aria-hidden="true" 
                                class="sg-icon sg-icon--adaptive sg-icon--x24" 
                                style="font-family: 'Roboto', sans-serif; font-weight: bold; font-size: 14px; display: flex; align-items: center; justify-content: center;">
                                AI
                            </div>
                        </span>
                        <span class="sg-button__text"></span>
                    </button>
                </div>
            </div>
        </div>
        <select id="gpt24-model-select" 
            class="sg-button sg-button--m sg-button--transparent" 
            style="cursor: pointer; text-transform: none; padding: 0 8px; display: flex; align-items: center; justify-content: center; text-align: center; text-align-last: center; background: transparent; color: #323c45; font-weight: bold; border: none;">
            <option value="gpt-4o" style="background: white; color: #323c45; font-weight: bold;">GPT-4</option>
            <option value="gpt-4o-mini" style="background: white; color: #323c45; font-weight: bold;">GPT-4 Mini</option>
            <option value="gpt-4o-turbo" style="background: white; color: #323c45; font-weight: bold;">GPT-4 Turbo</option>
        </select>
    </div>`;

        const parser = new DOMParser();
        const buttonElement = parser.parseFromString(buttonHtml, 'text/html').body.firstChild;

        // Add CSS to modify the answer editor width
        const style = document.createElement('style');
        style.textContent = `
            .brn-answer-editor-layer__content {
                width: 790px !important;
            }
            #gpt24-model-select {
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
                border-radius: 20px;
            }
            #gpt24-model-select:focus {
                outline: none;
            }
            #gpt24-model-select option {
                border-radius: 8px;
                padding: 4px 8px;
            }
            #gpt24-model-select optgroup {
                border-radius: 8px;
            }
        `;
        document.head.appendChild(style);

        return buttonElement;
    }

    function addGPTButton() {
        const toolbar = document.querySelector('.Toolbar__toolbar--I6NTy');
        if (!toolbar) return;

        // Add separator before the button
        const separator = document.createElement('div');
        separator.className = 'sg-vertical-separator sg-vertical-separator--gray-50';
        separator.setAttribute('role', 'separator');
        separator.setAttribute('aria-orientation', 'vertical');
        separator.style.marginRight = '0px';
        toolbar.appendChild(separator);

        // Add the AI button with dropdown
        const gptButton = createAIButton();
        toolbar.appendChild(gptButton);

        // Add click handler
        const button = gptButton.querySelector('#gpt24-answer-button');
        const modelSelect = gptButton.querySelector('#gpt24-model-select');

        button.addEventListener('click', () => {
            const question = getQuestionData();
            if (question) {
                const selectedModel = modelSelect.value;
                clearEditor();
                processQuestion(question, selectedModel);
            }
        });
    }

    function getAnswerEditor() {
        return document.querySelector('#slate-editable');
    }

    function insertText(text) {
        const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
        });

        pasteEvent.clipboardData.setData('text/plain', text);

        const editor = getAnswerEditor();
        if (editor) {
            editor.focus();
            editor.dispatchEvent(pasteEvent);
        }
    }

    function clearEditor() {
        currentText = '';
        const editor = getAnswerEditor();
        if (!editor) return;

        editor.focus();

        editor.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'a',
            code: 'KeyA',
            ctrlKey: true,
            bubbles: true,
            cancelable: true
        }));

        setTimeout(() => {
            editor.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Backspace',
                code: 'Backspace',
                bubbles: true,
                cancelable: true
            }));
        }, 50);
    }

    async function updateAnswer(text) {
        const newText = text.slice(currentText.length);
        currentText = text;

        if (newText) {
            insertText(newText);
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    async function processQuestion(question, model) {
        console.log('Processing question:', question, 'with model:', model);
        try {
            const editor = getAnswerEditor();
            if (!editor) return;

            editor.focus();
            clearEditor();
            await new Promise(resolve => setTimeout(resolve, 100));

            const handleStream = async (chunk) => {
                await updateAnswer(chunk);
            };

            await gpt24.getAnswer(question.text, handleStream, question.images, model);
        } catch (error) {
            console.error('Error getting answer:', error);
            await updateAnswer('Error: Failed to get answer');
        }
    }

    function getQuestionData() {
        const questionContainer = document.querySelector('.brn-answer-editor-layer__aside-content[data-testid="answer_editor_layer_aside"]');
        if (!questionContainer) return null;

        const questionText = questionContainer.querySelector('.sg-text.sg-text--text-gray-70')?.innerText;
        if (!questionText) return null;

        // Get image URLs from attachments
        const images = [];

        // Get main image
        const mainImage = questionContainer.querySelector('.brn-main-attachment img');
        if (mainImage?.src) {
            images.push(mainImage.src);
        }

        // Get additional images
        const attachedImages = questionContainer.querySelectorAll('.brn-attachments__thumbnail img.brn-image');
        attachedImages.forEach(img => {
            if (img.src && !images.includes(img.src)) {
                images.push(img.src);
            }
        });

        return {
            text: questionText.replace('Задание', '').trim(),
            images: images
        };
    }

    function startMonitoring() {
        const intervalId = setInterval(() => {
            if (document.querySelector('#gpt24-answer-button')) {
                clearInterval(intervalId);
                return;
            }

            if (document.querySelector('.Toolbar__toolbar--I6NTy')) {
                addGPTButton();
                clearInterval(intervalId);
            }
        }, 1000);
    }

    setTimeout(startMonitoring, 1000);
})();