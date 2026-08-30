import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PostgisSchemaBootstrap implements OnModuleInit {
  private initialization: Promise<void> | null = null;

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit(): Promise<void> { return this.ensureReady(); }

  ensureReady(): Promise<void> {
    this.initialization ??= this.initialize();
    return this.initialization;
  }

  private async initialize(): Promise<void> {
    await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS driver_location_history (
        id uuid PRIMARY KEY,
        driver_id uuid NOT NULL,
        latitude double precision NOT NULL,
        longitude double precision NOT NULL,
        speed_kph double precision NULL,
        heading_degrees double precision NULL,
        recorded_at timestamptz NOT NULL,
        received_at timestamptz NOT NULL,
        position geography(Point, 4326) NOT NULL
      )
    `);
    await this.dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_driver_location_history_driver_time
      ON driver_location_history(driver_id, recorded_at)
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_driver_location_history_driver_time
      ON driver_location_history(driver_id, recorded_at DESC)
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_driver_location_history_position
      ON driver_location_history USING GIST(position)
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS driver_latest_locations (
        driver_id uuid PRIMARY KEY,
        latitude double precision NOT NULL,
        longitude double precision NOT NULL,
        speed_kph double precision NULL,
        heading_degrees double precision NULL,
        recorded_at timestamptz NOT NULL,
        received_at timestamptz NOT NULL,
        position geography(Point, 4326) NOT NULL
      )
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_driver_latest_locations_position
      ON driver_latest_locations USING GIST(position)
    `);
  }
}
