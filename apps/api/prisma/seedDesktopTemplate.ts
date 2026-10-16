import 'dotenv/config';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient, StaffRole, Departemen } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/lib/password.js';

const url = process.env.DATABASE_URL ?? 'file:dev.db';
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

/** Seed minimal untuk template database aplikasi desktop — hanya akun login, tanpa data contoh. */
async function main() {
  const adminPasswordHash = await hashPassword('admin123');
  const karyawanPasswordHash = await hashPassword('karyawan123');
  const radiologiPasswordHash = await hashPassword('radiologi123');
  const labPasswordHash = await hashPassword('lab123');

  await prisma.staff.createMany({
    data: [
      {
        nama: 'Admin LabPrima',
        email: 'admin@primahusada.local',
        passwordHash: adminPasswordHash,
        role: StaffRole.ADMIN,
      },
      {
        nama: 'Karyawan Demo',
        email: 'karyawan@primahusada.local',
        passwordHash: karyawanPasswordHash,
        role: StaffRole.KARYAWAN,
      },
      // Akun berdepartemen: hanya boleh membuka modulnya sendiri
      // (lihat DEPARTMENT_NAV_IDS di frontend config/navigation.ts).
      {
        nama: 'Radiologi',
        email: 'radiologi@primahusada.local',
        passwordHash: radiologiPasswordHash,
        role: StaffRole.KARYAWAN,
        departemen: Departemen.RADIOLOGI,
      },
      {
        nama: 'Laboratorium',
        email: 'lab@primahusada.local',
        passwordHash: labPasswordHash,
        role: StaffRole.KARYAWAN,
        departemen: Departemen.LABORATORIUM,
      },
    ],
  });

  console.log('Template database desktop siap (akun admin, karyawan, radiologi & laboratorium dibuat).');
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
