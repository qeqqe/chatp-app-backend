import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly API_URL =
    process.env.LM_STUDIO_API_URL || 'http://localhost:1234/v1';

  private readonly MODEL_MAP = {
    local: 'local model',
    qwen: 'qwen2.5-coder-7b-instruct',
    deepseek: 'deepseek-coder-33b-instruct',
    claude: 'claude-3-sonnet',
    openai: 'gpt-4',
    gemini: 'gemini-pro',
  } as const;

  async *streamChat(
    prompt: string,
    selectedModel?: string
  ): AsyncGenerator<string> {
    try {
      this.logger.debug('Sending request to:', `/completions`);

      // Simple prompt format that works with LM Studio
      const finalPrompt = `### Instruction: Analyze the following code and explain its functionality:

${prompt}

### Response:`;

      const response = await fetch(`${this.API_URL}/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          model: this.getModelName(selectedModel),
          temperature: 0.3,
          max_tokens: 2000,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim() || line === 'data: [DONE]') continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices?.[0]?.text) {
                yield data.choices[0].text;
              }
            } catch {
              continue;
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Stream error:', error);
      throw error;
    }
  }

  private getModelName(selectedModel?: string): string {
    return selectedModel && this.MODEL_MAP[selectedModel]
      ? this.MODEL_MAP[selectedModel]
      : 'deepseek-coder-6.7b-instruct';
  }
}
