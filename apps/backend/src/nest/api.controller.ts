import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class ApiController {
  @Get()
  info() {
    return {
      name: 'D Racing Pro API',
      version: '0.1.0',
    };
  }
}
