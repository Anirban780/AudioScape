import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleAuthGuard implements CanActivate {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Unauthorized: Missing or invalid Authorization Bearer header');
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      const user = await this.authService.verifyAndFetchUser(idToken);
      request.user = user;
      return true;
    } catch (error: any) {
      this.logger.error(`Google Auth Guard failed: ${error.message}`);
      throw new UnauthorizedException(`Unauthorized: ${error.message}`);
    }
  }
}
