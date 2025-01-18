import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AiService } from './ai.service';
import { Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

interface ChatData {
  message: string;
  files?: string[];
  model?: string;
}

interface CachedFile {
  content: string;
  [key: string]: unknown;
}

@WebSocketGateway({
  cors: {
    origin: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  },
  transports: ['websocket'],
  namespace: '/',
})
export class AiGateway {
  private readonly logger = new Logger(AiGateway.name);

  constructor(
    private readonly aiService: AiService,
    private readonly redis: RedisService
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat')
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ChatData
  ) {
    try {
      // Build a simple, clear prompt
      const parts = [];

      // Add file contents first
      if (data.files?.length) {
        for (const filePath of data.files) {
          const cached = await this.redis.getCachedFile<CachedFile>(
            'current',
            'repo',
            filePath
          );
          if (cached?.content) {
            parts.push(
              `File: ${filePath}\n\`\`\`\n${cached.content}\n\`\`\`\n`
            );
          }
        }
      }

      // Add user's question
      parts.push(data.message);

      const fullPrompt = parts.join('\n\n');
      this.logger.debug('Full prompt:', fullPrompt);

      // Stream response
      client.emit('chat-start');
      const generator = this.aiService.streamChat(fullPrompt, data.model);
      let response = '';

      for await (const chunk of generator) {
        if (!client.connected) break;
        response += chunk;
        client.emit('chat-response', { content: response });
      }

      client.emit('chat-complete');
    } catch (error) {
      this.logger.error('Chat error:', error);
      client.emit('chat-error', {
        message: error.message || 'Failed to process chat message',
      });
    }
  }
}
