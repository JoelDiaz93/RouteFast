import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DriversClient } from './drivers.client';
import { DriversController } from './drivers.controller';
@Module({ imports:[HttpModule], controllers:[DriversController], providers:[DriversClient] })
export class DriversModule {}
