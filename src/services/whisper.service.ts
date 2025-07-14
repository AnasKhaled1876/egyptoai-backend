import { OpenAI } from 'openai';
import * as fs from 'fs';

/**
 * Transcribes an audio file using OpenAI Whisper API.
 * @param filePath Path to the audio file (wav, mp3, m4a, etc.)
 * @returns Transcribed text
 */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Transcribes an audio file using OpenAI Whisper API via the official SDK.
 * @param filePath Path to the audio file (wav, mp3, m4a, etc.)
 * @returns Transcribed text
 */
export async function transcribeAudioWithWhisper(filePath: string): Promise<string> {
  console.log('[Whisper] transcribeAudioWithWhisper called with filePath:', filePath);
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  // Check if file exists
  const exists = fs.existsSync(filePath);
  console.log('[Whisper] File exists:', exists, 'at', filePath);
  if (!exists) {
    throw new Error(`[Whisper] File not found: ${filePath}`);
  }

  try {
    console.log('[Whisper] Starting OpenAI transcription for:', filePath);
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      // language: 'en', // Optional: specify language
      // prompt: '', // Optional: provide a prompt
      // response_format: 'text', // Default is 'json', can be 'text', 'srt', etc.
    });
    if (!transcription.text) {
      console.error('[Whisper] No transcription text returned from Whisper API');
      throw new Error('No transcription text returned from Whisper API');
    }
    return transcription.text;
  } catch (error: any) {
    console.error('[Whisper] OpenAI Whisper SDK error:', error?.message || error);
    throw new Error('Failed to transcribe audio with Whisper.');
  }
}
