import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-internal-api-key'];
    const expected = this.configService.get<string>('INTERNAL_API_KEY');

    if (!apiKey || apiKey !== expected) {
      throw new UnauthorizedException('Invalid internal API key');
    }
    return true;
  }
}