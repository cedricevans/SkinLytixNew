import community1 from '@/assets/landing/community-1.jpg';
import community2 from '@/assets/landing/community-2.jpg';
import community3 from '@/assets/landing/community-3.jpg';
import community4 from '@/assets/landing/community-4.jpg';
import community5 from '@/assets/landing/community-5.jpg';

const CommunityPhotos = () => {
  const photos = [community1, community2, community3, community4, community5];

  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-[5px] lg:px-6">
        <div className="flex justify-center items-center gap-4 md:gap-6 flex-wrap">
          {photos.map((photo, index) => (
            <img
              key={index}
              src={photo}
              alt={`Community member ${index + 1}`}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover shadow-elegant"
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CommunityPhotos;
