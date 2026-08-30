import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { DriverLocationView } from '../../application/models/location.view';
import { LocationHistoryRepository } from '../../application/ports/location-history.repository';

interface LocationRow {
  driver_id: string;
  latitude: number | string;
  longitude: number | string;
  speed_kph: number | string | null;
  heading_degrees: number | string | null;
  recorded_at: Date | string;
  received_at: Date | string;
}

@Injectable()
export class PostgisLocationHistoryRepository implements LocationHistoryRepository {
  constructor(private readonly dataSource: DataSource) {}

  async append(location: DriverLocationView): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const params = [
        randomUUID(), location.driverId, location.latitude, location.longitude,
        location.speedKph, location.headingDegrees, location.recordedAt, location.receivedAt,
      ];
      await manager.query(`
        INSERT INTO driver_location_history
          (id, driver_id, latitude, longitude, speed_kph, heading_degrees, recorded_at, received_at, position)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography)
        ON CONFLICT (driver_id, recorded_at) DO NOTHING
      `, params);
      await manager.query(`
        INSERT INTO driver_latest_locations
          (driver_id, latitude, longitude, speed_kph, heading_degrees, recorded_at, received_at, position)
        VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography)
        ON CONFLICT (driver_id) DO UPDATE SET
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          speed_kph = EXCLUDED.speed_kph,
          heading_degrees = EXCLUDED.heading_degrees,
          recorded_at = EXCLUDED.recorded_at,
          received_at = EXCLUDED.received_at,
          position = EXCLUDED.position
        WHERE driver_latest_locations.recorded_at <= EXCLUDED.recorded_at
      `, [location.driverId, location.latitude, location.longitude, location.speedKph, location.headingDegrees, location.recordedAt, location.receivedAt]);
    });
  }

  async getLatest(driverId: string): Promise<DriverLocationView | null> {
    const rows = await this.dataSource.query(
      'SELECT driver_id, latitude, longitude, speed_kph, heading_degrees, recorded_at, received_at FROM driver_latest_locations WHERE driver_id = $1',
      [driverId],
    ) as LocationRow[];
    return rows[0] ? this.toView(rows[0]) : null;
  }

  async getHistory(driverId: string, limit: number): Promise<DriverLocationView[]> {
    const rows = await this.dataSource.query(`
      SELECT driver_id, latitude, longitude, speed_kph, heading_degrees, recorded_at, received_at
      FROM driver_location_history
      WHERE driver_id = $1
      ORDER BY recorded_at DESC
      LIMIT $2
    `, [driverId, limit]) as LocationRow[];
    return rows.map((row) => this.toView(row));
  }

  private toView(row: LocationRow): DriverLocationView {
    return {
      driverId: row.driver_id,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      speedKph: row.speed_kph === null ? null : Number(row.speed_kph),
      headingDegrees: row.heading_degrees === null ? null : Number(row.heading_degrees),
      recordedAt: new Date(row.recorded_at).toISOString(),
      receivedAt: new Date(row.received_at).toISOString(),
    };
  }
}
