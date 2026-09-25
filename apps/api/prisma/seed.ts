import 'dotenv/config';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient, StaffRole, Departemen } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/lib/password.js';

const url = process.env.DATABASE_URL ?? 'file:dev.db';
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.pasienPemeriksaan.deleteMany();
  await prisma.pasien.deleteMany();
  await prisma.hargaLayanan.deleteMany();
  await prisma.jenisPemeriksaan.deleteMany();
  await prisma.kesanTemplate.deleteMany();
  await prisma.dokter.deleteMany();
  await prisma.radiolog.deleteMany();
  await prisma.staff.deleteMany();

  const [
    adminPasswordHash,
    karyawanPasswordHash,
    pendaftaranPasswordHash,
    radiologiPasswordHash,
    labPasswordHash,
    keuanganPasswordHash,
    farmasiPasswordHash,
    ceoPasswordHash,
  ] = await Promise.all([
    hashPassword('admin123'),
    hashPassword('karyawan123'),
    hashPassword('pendaftaran123'),
    hashPassword('radiologi123'),
    hashPassword('lab123'),
    hashPassword('keuangan123'),
    hashPassword('farmasi123'),
    hashPassword('ceo123'),
  ]);

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
      // Akun berdepartemen: masing-masing hanya boleh membuka modulnya
      // sendiri (lihat DEPARTMENT_NAV_IDS di frontend config/navigation.ts).
      {
        nama: 'Pendaftaran',
        email: 'pendaftaran@primahusada.local',
        passwordHash: pendaftaranPasswordHash,
        role: StaffRole.KARYAWAN,
        departemen: Departemen.PENDAFTARAN,
      },
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
      {
        nama: 'Keuangan',
        email: 'keuangan@primahusada.local',
        passwordHash: keuanganPasswordHash,
        role: StaffRole.KARYAWAN,
        departemen: Departemen.KEUANGAN,
      },
      {
        nama: 'Farmasi',
        email: 'farmasi@primahusada.local',
        passwordHash: farmasiPasswordHash,
        role: StaffRole.KARYAWAN,
        departemen: Departemen.FARMASI,
      },
      // CEO: role terpisah, tidak dibatasi departemen — bisa buka semua modul.
      {
        nama: 'CEO',
        email: 'ceo@primahusada.local',
        passwordHash: ceoPasswordHash,
        role: StaffRole.CEO,
      },
    ],
  });

  // Dokter pengirim. "Dr. Luar" adalah entri penampung untuk rujukan dari
  // dokter di luar daftar ini.
  const dokter = await prisma.dokter.create({ data: { nama: 'Dr. Anna Diah' } });
  await prisma.dokter.createMany({
    data: [
      { nama: 'Dr. Eva Christiani' },
      { nama: 'Dr. Iman Purnawan' },
      { nama: 'Dr. Luar' },
    ],
  });

  const radiolog = await prisma.radiolog.create({
    data: { nama: 'Dr. Toto Kuntoro, Sp.Rad' },
  });

  await prisma.petugasLab.create({ data: { nama: 'Susan Eka S, AmdAk' } });

  await prisma.radiografer.create({ data: { nama: "Chalimatusa'diah, SST" } });

  await prisma.adminKlinik.createMany({
    data: [{ nama: 'Zakiah' }, { nama: 'Agung Priyatna' }],
  });

  const thorax = await prisma.jenisPemeriksaan.create({ data: { nama: 'Rontgen Thorax' } });
  const ctScan = await prisma.jenisPemeriksaan.create({ data: { nama: 'CT Scan Abdomen' } });

  await prisma.hargaLayanan.createMany({
    data: [
      {
        jenisPemeriksaanId: thorax.id,
        harga: 150000,
        detailLayanan: 'Foto thorax PA + interpretasi',
      },
      {
        jenisPemeriksaanId: ctScan.id,
        harga: 2500000,
        detailLayanan: 'CT scan abdomen dengan kontras',
      },
    ],
  });

  await prisma.kesanTemplate.createMany({
    data: [
      {
        judul: 'Thorax',
        isi: 'Tb paru aktif kanan dan kiri\nTidak tampak cardiomegali',
      },
      {
        judul: 'Thorax Normal',
        isi: 'Cor dan pulmo dalam batas normal.\nTidak tampak infiltrat.',
      },
    ],
  });

  const today = new Date();
  const regDate = today.toISOString().slice(0, 10).replace(/-/g, '');

  await prisma.pasien.create({
    data: {
      regCode: `REG-${regDate}-001`,
      nama: 'Budi Santoso',
      tanggalLahir: new Date('1990-05-15'),
      noTelepon: '081211223344',
      alamat: 'Jl. Melati No. 12, Jakarta',
      pengirimId: dokter.id,
      klinis: 'Batuk berdahak 2 minggu',
      hasilStatus: 'MENUNGGU_HASIL',
      paymentStatus: 'BELUM_LUNAS',
      sharingType: 'FIXED',
      sharingPercent: 0,
      sharingAmount: 50000,
      totalHarga: 150000,
      totalSharing: 50000,
      radiologId: radiolog.id,
      pemeriksaan: {
        create: [{ jenisPemeriksaanId: thorax.id, hargaSnapshot: 150000 }],
      },
    },
  });

  console.log('Seed selesai.');
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
