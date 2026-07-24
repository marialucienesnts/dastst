document.addEventListener('DOMContentLoaded', async () => {
    if (window.PGMEI) {
        try {
            const state = await window.PGMEI.fetchState();
            if (!window.PGMEI.isSecondaryActive(state)) {
                if (window.PGMEI.getSession()) {
                    window.PGMEI.redirect('/oficial/');
                    return;
                }
                window.PGMEI.redirect('/login/');
                return;
            }
            await window.PGMEI.recordVisit('secondary', '/adv/');
        } catch (error) {
            console.warn('Falha ao sincronizar pagina adv:', error.message);
        }
    }

    // Hamburger Menu Toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when link is clicked
    document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }));

    // Testimonial Carousel
    let slideIndex = 0;
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');

    function showSlides(n) {
        if (slides.length === 0) return;
        
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        slideIndex = n !== undefined ? n : slideIndex + 1;
        
        if (slideIndex > slides.length - 1) slideIndex = 0;
        if (slideIndex < 0) slideIndex = slides.length - 1;

        slides[slideIndex].classList.add('active');
        dots[slideIndex].classList.add('active');
    }

    if (slides.length > 0) {
        let slideInterval = setInterval(() => showSlides(), 5000);

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                clearInterval(slideInterval);
                showSlides(index);
                slideInterval = setInterval(() => showSlides(), 5000);
            });
        });
    }

    // Scroll Animation (Fade-in elements)
    const fadeElements = document.querySelectorAll('.fade-in');
    
    const checkVisibility = () => {
        const triggerBottom = window.innerHeight / 5 * 4;
        
        fadeElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            
            if (elementTop < triggerBottom) {
                element.classList.add('visible');
            }
        });
    };

    window.addEventListener('scroll', checkVisibility);
    checkVisibility(); // Check on load

    // Header Background Change on Scroll
    const header = document.querySelector('header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 2px 15px rgba(0, 0, 0, 0.1)';
            header.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
        } else {
            header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
            header.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        }
    });

    if (window.PGMEI) {
        document.addEventListener('click', (event) => {
            const target = event.target.closest('button, a, input, select, textarea, label');
            if (!target) return;

            window.PGMEI.recordClick('secondary', '/adv/', target.textContent?.trim() || target.name || target.id || 'Clique');
        });
    }

    // Cookie Alert
    const cookieAlert = document.getElementById('cookie-alert');
    const acceptCookiesBtn = document.getElementById('accept-cookies');
    const contactForm = document.getElementById('adv-contact-form');
    const contactFeedback = document.getElementById('contact-feedback');

    if (cookieAlert && !localStorage.getItem('cookiesAccepted')) {
        setTimeout(() => {
            cookieAlert.classList.add('show');
        }, 1000);
    }

    if (acceptCookiesBtn) {
        acceptCookiesBtn.addEventListener('click', () => {
            localStorage.setItem('cookiesAccepted', 'true');
            cookieAlert.classList.remove('show');
        });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const name = document.getElementById('name')?.value.trim() || '';
            const email = document.getElementById('email')?.value.trim() || '';
            const phone = document.getElementById('phone')?.value.trim() || '';
            const message = document.getElementById('message')?.value.trim() || '';

            const whatsappMessage = [
                'Ola, vim pela pagina da advocacia e gostaria de atendimento.',
                '',
                `Nome: ${name}`,
                `E-mail: ${email}`,
                `Telefone: ${phone}`,
                `Mensagem: ${message}`
            ].join('\n');

            if (contactFeedback) {
                contactFeedback.textContent = 'Abrindo o WhatsApp para concluir o atendimento...';
            }

            window.open(`https://wa.me/551153723331?text=${encodeURIComponent(whatsappMessage)}`, '_blank', 'noopener');
        });
    }
});
