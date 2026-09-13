import { useMemo, useState } from 'react';
import { Modal } from './ui/Modal.tsx';

type LiverState = 'normal' | 'hepatomegali' | 'lesi';
type GbState = 'normal' | 'sludge' | 'batu' | 'cholecystitis';
type CbdState = 'normal' | 'dilatasi';
type PankreasState = 'normal' | 'kelainan';
type LimpaState = 'normal' | 'splenomegali';
type GinjalState = 'normal' | 'batu' | 'kista' | 'hidronefrosis';
type VuState = 'normal' | 'abnormal';
type AortaState = 'normal' | 'melebar';
type AppendiksState = 'normal' | 'apendisitis' | 'tidak-tervisualisasi';

interface IdentifikasiState {
  liver: LiverState;
  liverPanjangLobus: string;
  liverLesiUkuran: string;
  liverLesiLokasi: string;

  gb: GbState;
  gbBatuUkuran: string;
  gbCholecystitisKet: string;

  cbd: CbdState;
  cbdDiameter: string;

  pankreas: PankreasState;
  pankreasKet: string;

  limpa: LimpaState;

  ginjalKanan: GinjalState;
  ginjalKananUkuran: string;
  ginjalKiri: GinjalState;
  ginjalKiriUkuran: string;

  vu: VuState;
  vuKet: string;

  aorta: AortaState;
  aortaDiameter: string;

  appendiks: AppendiksState;
  appendiksDiameter: string;

  cairanBebas: boolean;
  cairanBebasLokasi: readonly string[];
  cairanBebasLainnya: string;
}

const INITIAL_STATE: IdentifikasiState = {
  liver: 'normal',
  liverPanjangLobus: '',
  liverLesiUkuran: '',
  liverLesiLokasi: '',
  gb: 'normal',
  gbBatuUkuran: '',
  gbCholecystitisKet: '',
  cbd: 'normal',
  cbdDiameter: '',
  pankreas: 'normal',
  pankreasKet: '',
  limpa: 'normal',
  ginjalKanan: 'normal',
  ginjalKananUkuran: '',
  ginjalKiri: 'normal',
  ginjalKiriUkuran: '',
  vu: 'normal',
  vuKet: '',
  aorta: 'normal',
  aortaDiameter: '',
  appendiks: 'normal',
  appendiksDiameter: '',
  cairanBebas: false,
  cairanBebasLokasi: [],
  cairanBebasLainnya: '',
};

const CAIRAN_BEBAS_LOKASI_OPTIONS = ['Morrison pouch', 'Perisplenic', 'Pelvis', 'Periappendiceal'] as const;

function liverSentence(s: IdentifikasiState): string {
  if (s.liver === 'hepatomegali') {
    const panjang = s.liverPanjangLobus.trim();
    return `Hepatomegali dengan fatty liver${panjang ? ` (panjang lobus kanan ± ${panjang} cm)` : ''}.`;
  }
  if (s.liver === 'lesi') {
    const ukuran = s.liverLesiUkuran.trim();
    const lokasi = s.liverLesiLokasi.trim();
    return `Tampak lesi fokal pada hepar${ukuran ? `, ukuran ${ukuran} cm` : ''}${lokasi ? `, lokasi ${lokasi}` : ''}.`;
  }
  return 'Tidak tampak kelainan fokal pada hepar.';
}

function gbSoloSentence(s: IdentifikasiState): string {
  switch (s.gb) {
    case 'sludge':
      return 'Tampak sludge pada vesica fellea.';
    case 'batu': {
      const mm = s.gbBatuUkuran.trim();
      return `Cholelithiasis${mm ? `, batu terbesar ± ${mm} mm` : ''}.`;
    }
    case 'cholecystitis': {
      const ket = s.gbCholecystitisKet.trim();
      return `Cholelithiasis disertai gambaran yang mendukung acute cholecystitis${ket ? ` (${ket})` : ''}.`;
    }
    default:
      return 'Vesica fellea ukuran dan dinding dalam batas normal. Tidak tampak cholelithiasis.';
  }
}

function cbdSoloSentence(s: IdentifikasiState): string {
  if (s.cbd === 'dilatasi') {
    const mm = s.cbdDiameter.trim();
    return `Dilatasi CBD${mm ? ` ± ${mm} mm` : ''}.`;
  }
  return 'Tidak tampak dilatasi duktus biliaris intra maupun ekstrahepatik.';
}

function pankreasSentence(s: IdentifikasiState): string {
  if (s.pankreas === 'kelainan') {
    const ket = s.pankreasKet.trim();
    return ket ? `Pankreas: ${ket}.` : 'Tampak kelainan pada pankreas.';
  }
  return 'Pankreas yang tervisualisasi tampak dalam batas normal.';
}

function limpaSentence(s: IdentifikasiState): string {
  return s.limpa === 'splenomegali' ? 'Splenomegali.' : 'Lien ukuran dan echotexture dalam batas normal.';
}

function ginjalSentence(state: GinjalState, ukuran: string): string {
  switch (state) {
    case 'batu':
      return `Nephrolithiasis${ukuran ? `, ukuran ± ${ukuran} mm` : ''}.`;
    case 'kista':
      return `Kista${ukuran ? `, ukuran ± ${ukuran} cm` : ''}.`;
    case 'hidronefrosis':
      return 'Hydronephrosis.';
    default:
      return 'Dalam batas normal, tidak tampak nephrolithiasis maupun hydronephrosis.';
  }
}

function vuSentence(s: IdentifikasiState): string {
  if (s.vu === 'abnormal') {
    const ket = s.vuKet.trim();
    return ket ? `Vesica urinaria: ${ket}.` : 'Tampak kelainan pada vesica urinaria.';
  }
  return 'Vesica urinaria dalam batas normal.';
}

function aortaSentence(s: IdentifikasiState): string {
  if (s.aorta === 'melebar') {
    const mm = s.aortaDiameter.trim();
    return `Aorta abdominalis melebar${mm ? ` ± ${mm} mm` : ''}.`;
  }
  return 'Aorta abdominalis tidak tampak aneurisma pada bagian yang tervisualisasi.';
}

function appendiksSentence(s: IdentifikasiState): string {
  if (s.appendiks === 'apendisitis') {
    const mm = s.appendiksDiameter.trim();
    return `Acute appendicitis${mm ? ` (diameter apendiks ± ${mm} mm)` : ''}.`;
  }
  if (s.appendiks === 'tidak-tervisualisasi') {
    return 'Apendiks tidak tervisualisasi secara optimal. Korelasi klinis dianjurkan.';
  }
  return 'Tidak tampak gambaran sonografis acute appendicitis.';
}

function cairanBebasSentence(s: IdentifikasiState): string {
  if (!s.cairanBebas) return 'Tidak tampak ascites.';
  const lokasi = [...s.cairanBebasLokasi, ...(s.cairanBebasLainnya.trim() ? [s.cairanBebasLainnya.trim()] : [])];
  return `Tampak free fluid${lokasi.length > 0 ? ` di ${lokasi.join(', ')}` : ''}.`;
}

/** Susun kesan/impression dalam bentuk daftar bernomor dari seluruh pilihan
 * organ. Baris GB+CBD, Pankreas+Limpa, dan Ginjal Kanan+Kiri digabung jadi
 * satu baris ringkas kalau keduanya normal (sesuai gaya contoh kesimpulan
 * pada laporan USG abdomen standar). */
function generateKesan(s: IdentifikasiState): string {
  const lines: string[] = [];

  lines.push(liverSentence(s));

  if (s.gb === 'normal' && s.cbd === 'normal') {
    lines.push('Vesica fellea dan traktus biliaris dalam batas normal.');
  } else {
    lines.push(gbSoloSentence(s));
    lines.push(cbdSoloSentence(s));
  }

  if (s.pankreas === 'normal' && s.limpa === 'normal') {
    lines.push('Pankreas dan lien dalam batas normal.');
  } else {
    lines.push(pankreasSentence(s));
    lines.push(limpaSentence(s));
  }

  if (s.ginjalKanan === 'normal' && s.ginjalKiri === 'normal') {
    lines.push('Kedua ginjal dalam batas normal, tidak tampak nephrolithiasis maupun hydronephrosis.');
  } else {
    lines.push(`Ginjal kanan: ${ginjalSentence(s.ginjalKanan, s.ginjalKananUkuran)}`);
    lines.push(`Ginjal kiri: ${ginjalSentence(s.ginjalKiri, s.ginjalKiriUkuran)}`);
  }

  lines.push(vuSentence(s));
  lines.push(aortaSentence(s));
  lines.push(appendiksSentence(s));
  lines.push(cairanBebasSentence(s));

  return lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
}

interface ChoiceGroupProps<T extends string> {
  readonly value: T;
  readonly options: ReadonlyArray<{ readonly value: T; readonly label: string }>;
  readonly onChange: (value: T) => void;
}

function ChoiceGroup<T extends string>({ value, options, onChange }: ChoiceGroupProps<T>) {
  return (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`btn btn--sm ${value === opt.value ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => onChange(opt.value)}
          style={value !== opt.value ? { border: '1px solid var(--color-border)' } : undefined}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SmallInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.78rem', marginTop: '0.5rem' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
      />
    </label>
  );
}

function Section({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '0.75rem 0.9rem',
        background: 'var(--color-surface-2, #f8fafc)',
      }}
    >
      <p style={{ margin: '0 0 0.4rem', fontWeight: 700, fontSize: '0.85rem', color: '#2b4c9b' }}>{title}</p>
      {children}
    </div>
  );
}

interface UsgIdentifikasiModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onGunakan: (kesanText: string) => void;
}

/** Modal "Identifikasi USG": checklist dinamis per organ (Liver, Vesica
 * Fellea, CBD, Pankreas, Limpa, kedua Ginjal, Vesica Urinaria, Aorta,
 * Appendiks, Cairan Bebas Abdomen) untuk laporan USG Abdomen. Radiolog
 * tinggal memilih temuan per organ (bukan mengetik manual satu-satu),
 * lalu teks Kesan dibangun otomatis dan bisa dipakai langsung mengisi
 * form Tambah Pasien USG. */
export function UsgIdentifikasiModal({ open, onClose, onGunakan }: UsgIdentifikasiModalProps) {
  const [state, setState] = useState<IdentifikasiState>(INITIAL_STATE);
  const [kesanText, setKesanText] = useState('');

  const previewKesan = useMemo(() => generateKesan(state), [state]);

  function update<K extends keyof IdentifikasiState>(key: K, value: IdentifikasiState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCairanLokasi(lokasi: string) {
    setState((prev) => ({
      ...prev,
      cairanBebasLokasi: prev.cairanBebasLokasi.includes(lokasi)
        ? prev.cairanBebasLokasi.filter((l) => l !== lokasi)
        : [...prev.cairanBebasLokasi, lokasi],
    }));
  }

  function handleClose() {
    setState(INITIAL_STATE);
    setKesanText('');
    onClose();
  }

  function handleGunakan() {
    onGunakan(kesanText.trim() || previewKesan);
    setState(INITIAL_STATE);
    setKesanText('');
  }

  return (
    <Modal open={open} title="🩻 Identifikasi USG Abdomen" onClose={handleClose} size="xl">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
          Pilih temuan tiap organ, lalu klik <strong>Buat Kesan dari Pilihan</strong>. Teks yang dihasilkan bisa
          diedit manual sebelum dipakai mengisi form Tambah Pasien.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.6rem' }}>
          <Section title="I. Liver / Hepar">
            <ChoiceGroup
              value={state.liver}
              onChange={(v) => update('liver', v)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'hepatomegali', label: 'Hepatomegali / Fatty Liver' },
                { value: 'lesi', label: 'Lesi Fokal' },
              ]}
            />
            {state.liver === 'hepatomegali' && (
              <SmallInput
                label="Panjang lobus kanan (cm)"
                value={state.liverPanjangLobus}
                onChange={(v) => update('liverPanjangLobus', v)}
                placeholder="mis. 16"
              />
            )}
            {state.liver === 'lesi' && (
              <>
                <SmallInput
                  label="Ukuran lesi (cm)"
                  value={state.liverLesiUkuran}
                  onChange={(v) => update('liverLesiUkuran', v)}
                  placeholder="mis. 2 x 3"
                />
                <SmallInput
                  label="Lokasi lesi"
                  value={state.liverLesiLokasi}
                  onChange={(v) => update('liverLesiLokasi', v)}
                  placeholder="mis. segmen VI"
                />
              </>
            )}
          </Section>

          <Section title="II. Vesica Fellea / Kandung Empedu">
            <ChoiceGroup
              value={state.gb}
              onChange={(v) => update('gb', v)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'sludge', label: 'Sludge' },
                { value: 'batu', label: 'Cholelithiasis' },
                { value: 'cholecystitis', label: 'Cholecystitis' },
              ]}
            />
            {state.gb === 'batu' && (
              <SmallInput
                label="Ukuran batu terbesar (mm)"
                value={state.gbBatuUkuran}
                onChange={(v) => update('gbBatuUkuran', v)}
                placeholder="mis. 8"
              />
            )}
            {state.gb === 'cholecystitis' && (
              <SmallInput
                label="Keterangan tambahan"
                value={state.gbCholecystitisKet}
                onChange={(v) => update('gbCholecystitisKet', v)}
                placeholder="mis. sonographic Murphy sign positif"
              />
            )}
          </Section>

          <Section title="III. Duktus Bilier (CBD)">
            <ChoiceGroup
              value={state.cbd}
              onChange={(v) => update('cbd', v)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'dilatasi', label: 'Dilatasi' },
              ]}
            />
            {state.cbd === 'dilatasi' && (
              <SmallInput
                label="Diameter CBD (mm)"
                value={state.cbdDiameter}
                onChange={(v) => update('cbdDiameter', v)}
                placeholder="mis. 9"
              />
            )}
          </Section>

          <Section title="IV. Pankreas">
            <ChoiceGroup
              value={state.pankreas}
              onChange={(v) => update('pankreas', v)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'kelainan', label: 'Ada Kelainan' },
              ]}
            />
            {state.pankreas === 'kelainan' && (
              <SmallInput
                label="Keterangan"
                value={state.pankreasKet}
                onChange={(v) => update('pankreasKet', v)}
                placeholder="mis. massa caput pankreas"
              />
            )}
          </Section>

          <Section title="V. Limpa / Lien">
            <ChoiceGroup
              value={state.limpa}
              onChange={(v) => update('limpa', v)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'splenomegali', label: 'Splenomegali' },
              ]}
            />
          </Section>

          <Section title="VI. Ginjal Kanan">
            <ChoiceGroup
              value={state.ginjalKanan}
              onChange={(v) => update('ginjalKanan', v)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'batu', label: 'Batu' },
                { value: 'kista', label: 'Kista' },
                { value: 'hidronefrosis', label: 'Hydronephrosis' },
              ]}
            />
            {(state.ginjalKanan === 'batu' || state.ginjalKanan === 'kista') && (
              <SmallInput
                label={state.ginjalKanan === 'batu' ? 'Ukuran batu (mm)' : 'Ukuran kista (cm)'}
                value={state.ginjalKananUkuran}
                onChange={(v) => update('ginjalKananUkuran', v)}
              />
            )}
          </Section>

          <Section title="VII. Ginjal Kiri">
            <ChoiceGroup
              value={state.ginjalKiri}
              onChange={(v) => update('ginjalKiri', v)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'batu', label: 'Batu' },
                { value: 'kista', label: 'Kista' },
                { value: 'hidronefrosis', label: 'Hydronephrosis' },
              ]}
            />
            {(state.ginjalKiri === 'batu' || state.ginjalKiri === 'kista') && (
              <SmallInput
                label={state.ginjalKiri === 'batu' ? 'Ukuran batu (mm)' : 'Ukuran kista (cm)'}
                value={state.ginjalKiriUkuran}
                onChange={(v) => update('ginjalKiriUkuran', v)}
              />
            )}
          </Section>

          <Section title="VIII. Vesica Urinaria">
            <ChoiceGroup
              value={state.vu}
              onChange={(v) => update('vu', v)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'abnormal', label: 'Ada Kelainan' },
              ]}
            />
            {state.vu === 'abnormal' && (
              <SmallInput
                label="Keterangan"
                value={state.vuKet}
                onChange={(v) => update('vuKet', v)}
                placeholder="mis. dinding menebal, sedimen"
              />
            )}
          </Section>

          <Section title="IX. Aorta Abdominalis">
            <ChoiceGroup
              value={state.aorta}
              onChange={(v) => update('aorta', v)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'melebar', label: 'Melebar' },
              ]}
            />
            {state.aorta === 'melebar' && (
              <SmallInput
                label="Diameter maksimal (mm)"
                value={state.aortaDiameter}
                onChange={(v) => update('aortaDiameter', v)}
              />
            )}
          </Section>

          <Section title="X. Evaluasi Appendiks">
            <ChoiceGroup
              value={state.appendiks}
              onChange={(v) => update('appendiks', v)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'apendisitis', label: 'Mendukung Apendisitis' },
                { value: 'tidak-tervisualisasi', label: 'Tidak Tervisualisasi' },
              ]}
            />
            {state.appendiks === 'apendisitis' && (
              <SmallInput
                label="Diameter apendiks (mm)"
                value={state.appendiksDiameter}
                onChange={(v) => update('appendiksDiameter', v)}
              />
            )}
          </Section>

          <Section title="XI. Cairan Bebas Abdomen">
            <ChoiceGroup
              value={state.cairanBebas ? 'ada' : 'tidak'}
              onChange={(v) => update('cairanBebas', v === 'ada')}
              options={[
                { value: 'tidak', label: 'Tidak Tampak' },
                { value: 'ada', label: 'Tampak' },
              ]}
            />
            {state.cairanBebas && (
              <>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {CAIRAN_BEBAS_LOKASI_OPTIONS.map((lokasi) => (
                    <label key={lokasi} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}>
                      <input
                        type="checkbox"
                        checked={state.cairanBebasLokasi.includes(lokasi)}
                        onChange={() => toggleCairanLokasi(lokasi)}
                      />
                      {lokasi}
                    </label>
                  ))}
                </div>
                <SmallInput
                  label="Lokasi lainnya"
                  value={state.cairanBebasLainnya}
                  onChange={(v) => update('cairanBebasLainnya', v)}
                />
              </>
            )}
          </Section>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setKesanText(previewKesan)}
          >
            🔄 Buat Kesan dari Pilihan
          </button>
        </div>

        <div className="form-field form-field--full">
          <label htmlFor="usg-identifikasi-kesan" style={{ color: '#2b4c9b', fontWeight: 700 }}>
            Kesan / Impression (bisa diedit manual):
          </label>
          <textarea
            id="usg-identifikasi-kesan"
            rows={8}
            value={kesanText}
            onChange={(e) => setKesanText(e.target.value)}
            placeholder="Klik 'Buat Kesan dari Pilihan' untuk mengisi otomatis, atau tulis manual di sini."
            style={{ border: '1px solid #cbd5e1', borderRadius: '4px', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn--ghost" onClick={handleClose}>
            Batal
          </button>
          <button type="button" className="btn btn--primary" onClick={handleGunakan}>
            Gunakan sebagai Kesan
          </button>
        </div>
      </div>
    </Modal>
  );
}
