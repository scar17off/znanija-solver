import { GPT24Provider } from './providers/gpt24';
import { MulaiProvider } from './providers/mulai';

(function () {
    "use strict";

    const gpt24 = new GPT24Provider();
    const mulai = new MulaiProvider();
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
        <select id="provider-select" 
            class="sg-button sg-button--m sg-button--transparent" 
            style="cursor: pointer; text-transform: none; padding: 0 8px; display: flex; align-items: center; justify-content: center; text-align: center; text-align-last: center; background: transparent; color: #323c45; font-weight: bold; border: none;">
            <option value="gpt24" style="background: white; color: #323c45; font-weight: bold;">GPT24</option>
            <option value="mulai" style="background: white; color: #323c45; font-weight: bold;">Mulai</option>
        </select>
        <select id="gpt24-model-select" 
            class="sg-button sg-button--m sg-button--transparent" 
            style="cursor: pointer; text-transform: none; padding: 0 8px; display: flex; align-items: center; justify-content: center; text-align: center; text-align-last: center; background: transparent; color: #323c45; font-weight: bold; border: none;">
            <option value="gpt-4o" style="background: white; color: #323c45; font-weight: bold;">GPT-4</option>
            <option value="gpt-4o-mini" style="background: white; color: #323c45; font-weight: bold;">GPT-4 Mini</option>
            <option value="gpt-4o-turbo" style="background: white; color: #323c45; font-weight: bold;">GPT-4 Turbo</option>
        </select>
        <input id="cors-api-key" 
            type="text" 
            placeholder="CORS.SH API Key"
            class="sg-input sg-input--m"
            style="width: 150px; margin-left: 8px; display: none;"
            value="${localStorage.getItem('corsApiKey') || ''}"
        />
    </div>`;

        const parser = new DOMParser();
        const buttonElement = parser.parseFromString(buttonHtml, 'text/html').body.firstChild;

        // Add event listeners
        const providerSelect = buttonElement.querySelector('#provider-select');
        const modelSelect = buttonElement.querySelector('#gpt24-model-select');
        const corsKeyInput = buttonElement.querySelector('#cors-api-key');

        // Set initial provider from localStorage
        const savedProvider = localStorage.getItem('selectedProvider') || 'gpt24';
        providerSelect.value = savedProvider;
        modelSelect.style.display = savedProvider === 'gpt24' ? 'flex' : 'none';
        corsKeyInput.style.display = savedProvider === 'mulai' ? 'block' : 'none';

        // Event listener for provider selection
        providerSelect.addEventListener('change', (e) => {
            const selectedProvider = e.target.value;
            localStorage.setItem('selectedProvider', selectedProvider);
            modelSelect.style.display = selectedProvider === 'gpt24' ? 'flex' : 'none';
            corsKeyInput.style.display = selectedProvider === 'mulai' ? 'block' : 'none';
        });

        // Event listener for CORS API key
        corsKeyInput.addEventListener('change', (e) => {
            localStorage.setItem('corsApiKey', e.target.value);
        });

        // Add CSS to modify styles
        const style = document.createElement('style');
        style.textContent = `
            .brn-answer-editor-layer__content {
                width: 885px !important;
            }
            #provider-select,
            #gpt24-model-select {
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
                border-radius: 20px;
            }
            #provider-select:focus,
            #gpt24-model-select:focus {
                outline: none;
            }
            #provider-select option,
            #gpt24-model-select option {
                border-radius: 8px;
                padding: 4px 8px;
            }
            #provider-select optgroup,
            #gpt24-model-select optgroup {
                border-radius: 8px;
            }
            #cors-api-key {
                border: 1px solid #e1e3e5;
                border-radius: 20px;
                padding: 4px 12px;
                font-size: 13px;
            }
            #cors-api-key:focus {
                outline: none;
                border-color: #323c45;
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

            const selectedProvider = document.querySelector('#provider-select').value;
            if (selectedProvider === 'gpt24') {
                await gpt24.getAnswer(question.text, handleStream, question.images, model);
            } else {
                await mulai.getAnswer(question.text, handleStream, question.images);
            }
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