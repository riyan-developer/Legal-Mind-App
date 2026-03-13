import { env } from '../../config/env.js';
import { AppError } from '../../lib/app-error.js';
import type { RetrievedChunk, StreamAnswerEvent } from './chats.types.js';

const buildPythonUrl = (path: string) =>
  `${env.PYTHON_API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

const readJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const text = await response.text();
    throw new AppError(text || 'Python service request failed', response.status);
  }

  return (await response.json()) as T;
};

export const pythonService = {
  async embedQuestion(question: string) {
    const response = await fetch(buildPythonUrl('/questions/embed'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    const data = await readJson<{
      embedding: number[];
    }>(response);

    return data.embedding;
  },

  async *streamAnswer(question: string, chunks: RetrievedChunk[]) {
    const response = await fetch(buildPythonUrl('/answers/stream'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        chunks,
      }),
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new AppError(text || 'Python streaming request failed', response.status || 502);
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }

        yield JSON.parse(trimmed) as StreamAnswerEvent;
      }
    }

    const trailing = buffer.trim();
    if (trailing) {
      yield JSON.parse(trailing) as StreamAnswerEvent;
    }
  },
};
