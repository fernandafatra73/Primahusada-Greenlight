import { useEffect, useState } from 'react';
import { WELCOME_PHOTO_URL } from '../components/WelcomePhoto.tsx';
import { LOGIN_SLIDES, TAKEOFF_SLIDE_ID, nextSlideIndex, slideImageUrl, type LoginSlide } from '../lib/loginSlides.ts';
import { TakeoffSlide } from './TakeoffSlide.tsx';

// Foto slide dicari lewat glob supaya aplikasi tetap berjalan bila filenya belum ada.
const SLIDE_PHOTO_MODULES = import.meta.glob<string>('../../../../src/image/slide-*.*', {
  eager: true,
  query: '?url',
  import: 'default',
});

const CLINIC_ADDRESS = 'Jl. Siliwangi Ruko Palapa II Parung Kuda - Sukabumi';
const CLINIC_PHONE = 'Telp 0857-1932-5557';

function photoFor(slide: LoginSlide): string | null {
  if (slide.id === 'prima-husada') return WELCOME_PHOTO_URL;
  return slideImageUrl(SLIDE_PHOTO_MODULES, slide.id);
}

/** Latar halaman login: slide berganti otomatis sesuai durasinya, lalu berulang. */
export function LoginSlideshow() {
  const [index, setIndex] = useState(0);
  const active = LOGIN_SLIDES[index];

  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setTimeout(() => setIndex((i) => nextSlideIndex(i, LOGIN_SLIDES.length)), active.durationMs);
    return () => window.clearTimeout(timer);
  }, [active]);

  return (
    <div className="login-slides">
      {LOGIN_SLIDES.map((slide, i) => {
        if (slide.id === TAKEOFF_SLIDE_ID) {
          return (
            <section
              key={slide.id}
              className={`login-slide login-slide--${slide.id}${i === index ? ' login-slide--active' : ''}`}
              aria-hidden={i !== index}
            >
              <TakeoffSlide title={slide.title ?? ''} />
            </section>
          );
        }
        const photo = photoFor(slide);
        const isWelcome = slide.id === 'prima-husada';
        return (
          <section
            key={slide.id}
            className={`login-slide login-slide--${slide.id}${i === index ? ' login-slide--active' : ''}`}
            aria-hidden={i !== index}
          >
            {photo && isWelcome ? <img src={photo} alt="" className="login-slide__photo" /> : null}
            {photo && !isWelcome ? (
              // Foto slide biasanya kolase berlabel: ditampilkan utuh (tidak dipotong) di atas
              // baris tombol, sisa ruangnya diisi versi buram dari foto yang sama.
              <>
                <img src={photo} alt="" className="login-slide__backdrop" />
                <img src={photo} alt={slide.title ?? ''} className="login-slide__photo login-slide__photo--whole" />
              </>
            ) : null}

            {isWelcome && photo ? (
              // Alamat diletakkan di bawah slogan "Sehat Bersama, Hidup Lebih Baik" pada foto.
              <p className="login-frame__address">
                <span>{CLINIC_ADDRESS}</span>
                <span>{CLINIC_PHONE}</span>
              </p>
            ) : null}

            {/* Foto slide biasanya sudah memuat tulisannya sendiri; judul ditempel hanya bila diminta. */}
            {photo && slide.titleOnPhoto && slide.title !== null ? (
              <h2 className="login-slide__photo-title">{slide.title}</h2>
            ) : null}

            {/* Tanpa foto: kartu berwarna berisi judul dan isi slide. */}
            {!photo ? (
              <div className="login-slide__caption login-slide__caption--card">
                <h2 className="login-slide__title">{slide.title ?? 'Klinik Prima Husada'}</h2>
                {slide.items.length > 0 ? (
                  <ul className="login-slide__items">
                    {slide.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="login-slide__address">
                    {CLINIC_ADDRESS} &middot; {CLINIC_PHONE}
                  </p>
                )}
              </div>
            ) : null}
          </section>
        );
      })}

      <div className="login-slides__dots" role="tablist" aria-label="Slide">
        {LOGIN_SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={slide.title ?? 'Prima Husada'}
            className={i === index ? 'login-slides__dot login-slides__dot--active' : 'login-slides__dot'}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
