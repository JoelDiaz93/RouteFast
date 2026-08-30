import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TrackingClient } from './tracking.client';
import { TrackingController } from './tracking.controller';

@Module({ imports: [HttpModule], providers: [TrackingClient], controllers: [TrackingController] })
export class TrackingModule {}
