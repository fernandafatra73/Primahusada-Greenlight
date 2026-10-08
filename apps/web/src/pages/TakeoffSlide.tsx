import takeoffBackground from '@src/image/slide-takeoff-bg.jpg';
import takeoffPlane from '@src/image/slide-takeoff-plane.png';

interface TakeoffSlideProps {
  readonly title: string;
}

// Slide "Menuju Prima Husada 2035": latar bandara tanpa pesawat, lalu pesawat Prima
// Husada Airlines (dipotong dari foto yang sama) lepas landas dari kanan bawah ke kiri
// atas dengan lampu depan menyala, hidungnya pelan-pelan naik sampai sudut 30 derajat.
// Animasi diatur di login.css (.takeoff__flight) dan dimulai ulang setiap slide aktif.
export function TakeoffSlide({ title }: TakeoffSlideProps) {
  const [line1, ...rest] = title.split(' ');
  return (
    <div className="takeoff">
      <img src={takeoffBackground} alt="" className="takeoff__background" />
      <h2 className="takeoff__title">
        <span className="takeoff__title-small">{line1}</span>
        <span>{rest.join(' ')}</span>
      </h2>
      <div className="takeoff__flight">
        <div className="takeoff__plane">
          <span className="takeoff__beam" aria-hidden />
          <img src={takeoffPlane} alt="Pesawat Prima Husada Airlines" className="takeoff__plane-img" />
          <span className="takeoff__light" aria-hidden />
        </div>
      </div>
    </div>
  );
}
