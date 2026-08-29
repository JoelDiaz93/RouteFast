import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DispatchClient } from './dispatch.client';
import { DispatchController } from './dispatch.controller';
@Module({ imports:[HttpModule], controllers:[DispatchController], providers:[DispatchClient] })
export class DispatchModule {}
