document.addEventListener('DOMContentLoaded', function() {
  const carousels = document.querySelectorAll('.carousel');
  carousels.forEach(function(carousel) {
    const ul = carousel.querySelector('ul');
    const slides = carousel.querySelectorAll('ul li');
    const nextButton = carousel.querySelector('.next');
    const prevButton = carousel.querySelector('.prev');
    const bullets = carousel.querySelectorAll('ol li a');

    let currentSlide = 0;
    const totalSlides = slides.length;
    const duration = parseInt(carousel.getAttribute('duration')) || 7000;

    const updateCarousel = (index) => {
      ul.scrollLeft = slides[index].offsetLeft;
      bullets.forEach((bullet, i) => {
        bullet.style.background = i === index ? '#ccc' : '#fff';
      });
    };

    const nextSlide = () => {
      currentSlide = (currentSlide + 1) % totalSlides;
      updateCarousel(currentSlide);
    };

    const prevSlide = () => {
      currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
      updateCarousel(currentSlide);
    };

    nextButton.addEventListener('click', nextSlide);
    prevButton.addEventListener('click', prevSlide);

    bullets.forEach((bullet, index) => {
      bullet.addEventListener('click', (e) => {
        e.preventDefault();
        currentSlide = index;
        updateCarousel(currentSlide);
      });
    });

    // Autoplay
    setInterval(nextSlide, duration);
  });
});
