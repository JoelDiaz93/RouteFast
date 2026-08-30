import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DispatchClient } from '../dispatch/dispatch.client';
import { OptimizationController } from './optimization.controller';

@Module({ imports: [HttpModule], controllers: [OptimizationController], providers: [DispatchClient] })
export class OptimizationModule {}
