import { TokenService } from '@/shared/services/token.service'
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(private readonly tokenService: TokenService) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client)

      const payload = await this.tokenService.verifyAccessToken(token)

      client.data.userId = payload.userId

      await client.join(this.getUserRoom(payload.userId))
    } catch {
      client.disconnect(true)
    }
  }

  handleDisconnect(client: Socket) {}

  @SubscribeMessage('ping')
  ping(@ConnectedSocket() client: Socket) {
    return {
      event: 'pong',
      data: {
        userId: client.data.userId,
      },
    }
  }

  emitToUser(userId: number, event: string, payload: unknown) {
    this.server.to(this.getUserRoom(userId)).emit(event, payload)
  }

  private getUserRoom(userId: number) {
    return `user-${userId}`
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token

    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken
    }

    const authorization = client.handshake.headers.authorization

    if (authorization?.startsWith('Bearer ')) {
      return authorization.split(' ')[1]
    }
    throw new Error('Access token required')
  }
}
