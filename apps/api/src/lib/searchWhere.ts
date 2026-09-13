import type { Prisma } from '../generated/prisma/client.js';

export function searchTerm(q?: string): string | undefined {
  const t = q?.trim();
  return t && t.length > 0 ? t : undefined;
}

export function dokterListWhere(q?: string): Prisma.DokterWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { nama: { contains: term } },
      { spesialisasi: { contains: term } },
      { noTelepon: { contains: term } },
    ],
  };
}

export function karyawanKlinikListWhere(q?: string): Prisma.KaryawanKlinikWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { nama: { contains: term } },
      { spesialisasi: { contains: term } },
      { noTelepon: { contains: term } },
    ],
  };
}

export function radiologListWhere(q?: string): Prisma.RadiologWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { nama: { contains: term } },
      { noTelepon: { contains: term } },
    ],
  };
}

export function aiRadiologiGrupListWhere(q?: string): Prisma.AiRadiologiGrupWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return { nama: { contains: term } };
}

export function petugasLabListWhere(q?: string): Prisma.PetugasLabWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { nama: { contains: term } },
      { nip: { contains: term } },
      { noTelepon: { contains: term } },
    ],
  };
}

export function expertiseListWhere(q?: string): Prisma.ExpertiseWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { namaPenyakit: { contains: term } },
      { pemeriksaan: { contains: term } },
      { klinis: { contains: term } },
      { kesan: { contains: term } },
    ],
  };
}

export function radiograferListWhere(q?: string): Prisma.RadiograferWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { nama: { contains: term } },
      { noHp: { contains: term } },
    ],
  };
}

export function adminKlinikListWhere(q?: string): Prisma.AdminKlinikWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { nama: { contains: term } },
      { noHp: { contains: term } },
    ],
  };
}

export function logoPerusahaanListWhere(q?: string): Prisma.LogoPerusahaanWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { namaKlinik: { contains: term } },
      { alamat: { contains: term } },
      { email: { contains: term } },
    ],
  };
}

export function tandaTanganElektronikListWhere(q?: string): Prisma.TandaTanganElektronikWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { nama: { contains: term } },
      { alamat: { contains: term } },
    ],
  };
}

export function fotoDashboardListWhere(q?: string): Prisma.FotoDashboardWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [{ nama: { contains: term } }],
  };
}

export function sharingRadiologListWhere(q?: string): Prisma.SharingRadiologWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { namaPemeriksaan: { contains: term } },
      { radiolog: { nama: { contains: term } } },
    ],
  };
}

export function suratKeteranganSehatListWhere(q?: string): Prisma.SuratKeteranganSehatWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { namaPasien: { contains: term } },
      { nomorSurat: { contains: term } },
    ],
  };
}

export function suratKeteranganRujukanListWhere(q?: string): Prisma.SuratKeteranganRujukanWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { namaPasien: { contains: term } },
      { nomorSurat: { contains: term } },
    ],
  };
}

export function daftarAkunListWhere(q?: string): Prisma.DaftarAkunWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { namaAkun: { contains: term } },
      { gmail: { contains: term } },
      { nomorHp: { contains: term } },
    ],
  };
}

export function absensiAdminKlinikListWhere(q?: string): Prisma.AbsensiAdminKlinikWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return { namaKaryawan: { contains: term } };
}

export function suratPeringatanAdminKlinikListWhere(q?: string): Prisma.SuratPeringatanAdminKlinikWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { namaKaryawan: { contains: term } },
      { nomorSurat: { contains: term } },
    ],
  };
}

export function daftarTelponListWhere(q?: string): Prisma.DaftarTelponWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { nama: { contains: term } },
      { telpon: { contains: term } },
      { namaInstansi: { contains: term } },
      { noKontrak: { contains: term } },
    ],
  };
}

export function jenisListWhere(q?: string): Prisma.JenisPemeriksaanWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return { nama: { contains: term } };
}

export function kesanListWhere(q?: string): Prisma.KesanTemplateWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { judul: { contains: term } },
      { isi: { contains: term } },
    ],
  };
}

export function staffListWhere(q?: string, role?: string): Prisma.StaffWhereInput {
  const parts: Prisma.StaffWhereInput[] = [];
  if (role === 'ADMIN' || role === 'KARYAWAN' || role === 'CEO') {
    parts.push({ role });
  }
  const term = searchTerm(q);
  if (term) {
    parts.push({
      OR: [
        { nama: { contains: term } },
        { email: { contains: term } },
      ],
    });
  }
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0]!;
  return { AND: parts };
}

export function pasienListWhere(query: {
  q?: string;
  hasilStatus?: string;
  paymentStatus?: string;
  pengirimId?: string;
  startDate?: string;
  endDate?: string;
  modul?: string;
}): Prisma.PasienWhereInput {
  const where: Prisma.PasienWhereInput = {};

  if (query.pengirimId) {
    where.pengirimId = query.pengirimId;
  }
  if (query.modul === 'RADIOLOGI' || query.modul === 'LABORATORIUM') {
    where.asalModul = query.modul;
  }
  if (query.hasilStatus === 'MENUNGGU_HASIL' || query.hasilStatus === 'SELESAI') {
    where.hasilStatus = query.hasilStatus;
  }
  if (query.paymentStatus === 'BELUM_LUNAS' || query.paymentStatus === 'LUNAS') {
    where.paymentStatus = query.paymentStatus;
  }

  if (query.startDate || query.endDate) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.startDate) {
      createdAt.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    where.createdAt = createdAt;
  }

  const term = searchTerm(query.q);
  if (term) {
    where.OR = [
      { nama: { contains: term } },
      { regCode: { contains: term } },
      { noTelepon: { contains: term } },
      { alamat: { contains: term } },
      { pengirim: { nama: { contains: term } } },
    ];
  }

  return where;
}

export function pendaftaranUmumListWhere(query: {
  q?: string;
  startDate?: string;
  endDate?: string;
}): Prisma.PendaftaranUmumWhereInput {
  const where: Prisma.PendaftaranUmumWhereInput = {};

  if (query.startDate || query.endDate) {
    const tanggalMasuk: Prisma.DateTimeFilter = {};
    if (query.startDate) {
      tanggalMasuk.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      tanggalMasuk.lte = end;
    }
    where.tanggalMasuk = tanggalMasuk;
  }

  const term = searchTerm(query.q);
  if (term) {
    where.OR = [
      { namaPasien: { contains: term } },
      { noRegistrasi: { contains: term } },
    ];
  }

  return where;
}

export function usgListWhere(query: {
  q?: string;
  startDate?: string;
  endDate?: string;
}): Prisma.UsgWhereInput {
  const where: Prisma.UsgWhereInput = {};

  if (query.startDate || query.endDate) {
    const tanggal: Prisma.DateTimeFilter = {};
    if (query.startDate) {
      tanggal.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      tanggal.lte = end;
    }
    where.tanggal = tanggal;
  }

  const term = searchTerm(query.q);
  if (term) {
    where.namaPasien = { contains: term };
  }

  return where;
}

export function pasienAntreanWhere(q?: string): Prisma.PasienWhereInput {
  const where: Prisma.PasienWhereInput = { hasilStatus: 'MENUNGGU_HASIL' };
  const term = searchTerm(q);
  if (term) {
    where.OR = [
      { nama: { contains: term } },
      { regCode: { contains: term } },
    ];
  }
  return where;
}

export function pasienDuplikatListWhere(query: {
  q?: string;
  modul?: string;
  hasilStatus?: string;
  paymentStatus?: string;
  pengirimNama?: string;
  startDate?: string;
  endDate?: string;
}): Prisma.PasienDuplikatWhereInput {
  const where: Prisma.PasienDuplikatWhereInput = {};
  if (query.modul === 'RADIOLOGI' || query.modul === 'LABORATORIUM') {
    where.asalModul = query.modul;
  }
  if (query.hasilStatus === 'MENUNGGU_HASIL' || query.hasilStatus === 'SELESAI') {
    where.hasilStatus = query.hasilStatus;
  }
  if (query.paymentStatus === 'BELUM_LUNAS' || query.paymentStatus === 'LUNAS') {
    where.paymentStatus = query.paymentStatus;
  }
  if (query.pengirimNama) {
    const names = query.pengirimNama
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 1) {
      where.pengirimNama = names[0];
    } else if (names.length > 1) {
      where.pengirimNama = { in: names };
    }
  }
  if (query.startDate || query.endDate) {
    const registeredAt: Prisma.DateTimeFilter = {};
    if (query.startDate) {
      registeredAt.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      registeredAt.lte = end;
    }
    where.registeredAt = registeredAt;
  }
  const term = searchTerm(query.q);
  if (term) {
    where.OR = [
      { nama: { contains: term } },
      { regCode: { contains: term } },
      { noTelepon: { contains: term } },
      { alamat: { contains: term } },
      { pengirimNama: { contains: term } },
    ];
  }
  return where;
}

export function hargaListWhere(q?: string): Prisma.HargaLayananWhereInput {
  const term = searchTerm(q);
  if (!term) return {};
  return {
    OR: [
      { jenisPemeriksaan: { nama: { contains: term } } },
      { detailLayanan: { contains: term } },
    ],
  };
}

export function sharingListWhere(query: {
  q?: string;
  dokterId?: string;
}): Prisma.PasienWhereInput {
  const base = pasienListWhere({ q: query.q, pengirimId: query.dokterId });
  return base;
}
