import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'dispatch_decisions' })
export class DispatchDecisionOrmEntity {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Index({ unique: true }) @Column({ name: 'dispatch_id', type: 'uuid' }) dispatchId!: string;
  @Column({ name: 'strategy_version', type: 'varchar', length: 40 }) strategyVersion!: string;
  @Column({ type: 'varchar', length: 20 }) priority!: string;
  @Column({ name: 'search_radius_km', type: 'double precision' }) searchRadiusKm!: number;
  @Column({ name: 'pickup_latitude', type: 'double precision' }) pickupLatitude!: number;
  @Column({ name: 'pickup_longitude', type: 'double precision' }) pickupLongitude!: number;
  @Column({ name: 'ranked_candidates', type: 'jsonb' }) rankedCandidates!: unknown[];
  @Column({ name: 'selected_candidate_id', type: 'uuid', nullable: true }) selectedCandidateId!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
