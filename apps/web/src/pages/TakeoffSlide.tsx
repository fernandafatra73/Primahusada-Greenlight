import takeoffBackground from '@src/image/slide-takeoff-bg.jpg';
import takeoffPlane from '@src/image/slide-takeoff-plane.png';
// Awan diambil dari langit foto yang sama (bagian putihnya saja, tepinya dipudarkan).
import cloudLarge from '@src/image/takeoff-cloud-1.png';
import cloudPair from '@src/image/takeoff-cloud-2.png';
import cloudSoft from '@src/image/takeoff-cloud-3.png';

interface TakeoffSlideProps {
  readonly title: string;
}

/** Pesawat Prima Husada Airlines dengan lampu depan menyala dan sorot cahayanya. */
function PlaneSprite() {
  return (
    <div className="takeoff__plane">
      <span className="takeoff__beam" aria-hidden />
      <img src={takeoffPlane} alt="Pesawat Prima Husada Airlines" className="takeoff__plane-img" />
      <span className="takeoff__light" aria-hidden />
    </div>
  );
}

// Slide "Menuju Prima Husada 2035": latar bandara tanpa pesawat, lalu pesawat Prima
// Husada Airlines (dipotong dari foto yang sama) lepas landas dari kanan bawah ke kiri
// atas dengan lampu depan menyala, hidungnya pelan-pelan naik sampai sudut 30 derajat.
// Setelah hilang, pesawat muncul lagi dari kiri ke kanan di ketinggian jelajah,
// menembus awan (sebagian awan di belakang, sebagian di depan pesawat).
// Animasi diatur di login.css dan dimulai ulang setiap slide aktif.
export function TakeoffSlide({ title }: TakeoffSlideProps) {
  const [line1, ...rest] = title.split(' ');
  return (
    <div className="takeoff">
      <img src={takeoffBackground} alt="" className="takeoff__background" />
      <h2 className="takeoff__title">
        <span className="takeoff__title-small">{line1}</span>
        <span>{rest.join(' ')}</span>
      </h2>

      <div className="takeoff__clouds takeoff__clouds--back" aria-hidden>
        <img src={cloudSoft} alt="" className="takeoff__cloud takeoff__cloud--b1" />
        <img src={cloudLarge} alt="" className="takeoff__cloud takeoff__cloud--b2" />
        <img src={cloudPair} alt="" className="takeoff__cloud takeoff__cloud--b3" />
      </div>

      <div className="takeoff__flight">
        <PlaneSprite />
      </div>
      <div className="takeoff__cruise">
        <div className="takeoff__mirror">
          <PlaneSprite />
        </div>
      </div>

      <div className="takeoff__clouds takeoff__clouds--front" aria-hidden>
        <img src={cloudLarge} alt="" className="takeoff__cloud takeoff__cloud--f1" />
        <img src={cloudSoft} alt="" className="takeoff__cloud takeoff__cloud--f2" />
        <img src={cloudLarge} alt="" className="takeoff__cloud takeoff__cloud--f3" />
      </div>
    </div>
  );
}
