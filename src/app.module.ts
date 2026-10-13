import 'dotenv/config';
import { Module } from '@nestjs/common';
import { DemoModule } from './demo/demo.module.js';
import { HipaaSentinelModule } from './sentinel/index.js';

const required = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
};

@Module({
  imports: [
    HipaaSentinelModule.forRoot({
      dbDsn: required('AUDIT_DB_DSN'),
      jwtSecret: required('JWT_SECRET'),
    }),
    DemoModule,
  ],
})
export class AppModule {}
