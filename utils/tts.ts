// --- Configuration ---
// В реальной продакшн-среде это будет устанавливаться через переменные окружения.
// Режим 'CLOUD' требует бэкенд-эндпоинта для безопасной обработки API-вызовов.
// The `let` keyword was used to prevent TypeScript from over-narrowing this build-time
// flag's type, but it was insufficient. Removing the explicit union type allows the
// type to be inferred as `string`, which solves the comparison error.
let TTS_MODE = 'BROWSER';
const TTS_BACKEND_ENDPOINT = '/api/tts'; // Пример эндпоинта

/**
 * Имитирует вызов к бэкенд-сервису, который использует Google Cloud Text-to-Speech.
 * ВНИМАНИЕ: Это заглушка. Реальная имплементация требует бэкенд-сервера.
 * См. комментарии ниже для примера реализации бэкенда.
 * 
 * @param text Текст для синтеза.
 * @returns Promise, который разрешается с HTMLAudioElement для воспроизведения.
 */
const synthesizeWithGoogleCloud = async (text: string): Promise<HTMLAudioElement | null> => {
    if (TTS_MODE !== 'CLOUD') {
        return null; // Режим Cloud отключен.
    }

    console.log("Попытка использовать Google Cloud TTS через бэкенд...");

    try {
        /*
        // --- Как бы это работало с реальным бэкендом ---
        const response = await fetch(TTS_BACKEND_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            throw new Error(`Бэкенд-сервис TTS ответил с ошибкой: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        return audio;
        */

       // Так как у нас нет реального бэкенда, этот код пока всегда будет выдавать ошибку.
       throw new Error("Бэкенд для Google Cloud TTS не реализован в данном окружении.");

    } catch (error: any) {
        console.warn("Google Cloud TTS не удалось:", error.message, "Переключаюсь на синтез в браузере.");
        return null;
    }
};

/*
// --- Пример реализации бэкенда (например, в файле server.js) ---
// Этот код предназначен для демонстрации и должен выполняться на сервере, а не в браузере.
/*
const express = require('express');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const app = express();
app.use(express.json());

// Создание клиента
const client = new TextToSpeechClient();

app.post('/api/tts', async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).send({ error: 'Требуется текст' });
    }

    const request = {
        input: { text },
        // Выбор голоса в премиум-качестве WaveNet
        voice: { languageCode: 'ru-RU', name: 'ru-RU-Wavenet-D', ssmlGender: 'MALE' },
        audioConfig: { audioEncoding: 'MP3' },
    };

    try {
        const [response] = await client.synthesizeSpeech(request);
        res.set('Content-Type', 'audio/mpeg');
        res.send(response.audioContent);
    } catch (error) {
        console.error('TTS Ошибка:', error);
        res.status(500).send({ error: 'Не удалось синтезировать речь' });
    }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`TTS сервер запущен на порту ${PORT}`));
*/
// */


// Fix: Replaced incomplete browser synthesis logic with a complete, exported 'speak' function.
// This makes the file a module and provides awaitable speech synthesis for the app.
/**
 * Озвучивает текст, используя Cloud TTS с фолбэком на браузерный синтез.
 * @param text Текст для озвучки.
 * @param isEnabled Флаг, включен ли звук.
 * @returns Promise, который разрешается, когда озвучка завершена.
 */
export const speak = async (text: string, isEnabled: boolean): Promise<void> => {
    if (!isEnabled || !text.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return Promise.resolve();
    }

    // Отменяем любое текущее воспроизведение
    window.speechSynthesis.cancel();
    
    // Попытка использовать Cloud TTS
    if (TTS_MODE === 'CLOUD') {
        const cloudAudio = await synthesizeWithGoogleCloud(text);
        if (cloudAudio) {
            return new Promise((resolve) => {
                cloudAudio.onended = () => resolve();
                cloudAudio.onerror = () => resolve(); // Resolve even if there's an error
                cloudAudio.play().catch(() => resolve()); // Resolve even if play fails
            });
        }
        // Если Cloud TTS не удался, переходим к браузерному синтезу.
    }

    // Фолбэк или основной метод: браузерный синтез
    return new Promise((resolve) => {
        const speakSentences = (voices: SpeechSynthesisVoice[]) => {
            let selectedVoice: SpeechSynthesisVoice | null = null;
            if (voices.length > 0) {
                const russianVoices = voices.filter(voice => voice.lang === 'ru-RU');
                const preferredMaleNames = ['Google русский', 'Yuri', 'Pavel', 'Dmitry'];
                selectedVoice = russianVoices.find(voice =>
                    preferredMaleNames.some(name => voice.name.toLowerCase().includes(name.toLowerCase()))
                ) || null;
                if (!selectedVoice) {
                    selectedVoice = russianVoices.find(voice => !voice.localService) || null;
                }
                if (!selectedVoice && russianVoices.length > 0) {
                    selectedVoice = russianVoices[0];
                }
            }

            // Разбиваем текст на предложения для более гладкого воспроизведения
            const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
            if (sentences.length === 0 || (sentences.length === 1 && sentences[0].trim() === '')) {
                return resolve();
            }

            let sentenceIndex = 0;
            
            const speakNext = () => {
                if (sentenceIndex >= sentences.length) {
                    resolve();
                    return;
                }
                const sentence = sentences[sentenceIndex].trim();
                if (sentence) {
                    const utterance = new SpeechSynthesisUtterance(sentence);
                    if (selectedVoice) {
                        utterance.voice = selectedVoice;
                    } else {
                        utterance.lang = 'ru-RU';
                    }
                    utterance.pitch = 0.95;
                    utterance.rate = 1.05;
                    utterance.onend = () => {
                        sentenceIndex++;
                        speakNext();
                    };
                    utterance.onerror = (e) => {
                        console.error("SpeechSynthesisUtterance error", e);
                        sentenceIndex++; // try next sentence
                        speakNext();
                    };
                    window.speechSynthesis.speak(utterance);
                } else {
                    sentenceIndex++;
                    speakNext();
                }
            };
            
            speakNext();
        };

        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                speakSentences(window.speechSynthesis.getVoices());
                window.speechSynthesis.onvoiceschanged = null;
            };
        } else {
            speakSentences(voices);
        }
    });
};
