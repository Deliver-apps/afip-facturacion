import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Status } from '../types/status.types';

@Entity()
export class Jobs {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.Pending,
  })
  status: string;

  @Column({
    type: 'varchar',
    length: 30,
  })
  cronExpression: string;

  @Column({
    type: 'int',
  })
  userId: number;

  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
  })
  valueToBill: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  salePoint: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column({
    type: 'boolean',
    default: false,
  })
  external: boolean;
}
