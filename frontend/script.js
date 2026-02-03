function scrollToTop(event) {
    event.preventDefault();
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

const burger = document.getElementById('burger');
const navList = document.querySelector('.nav-list');

burger.addEventListener('click', function() {
    burger.classList.toggle('active');
    navList.classList.toggle('active');
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function() {
        burger.classList.remove('active');
        navList.classList.remove('active');
    });
});

function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        if (href === '#') {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            return;
        }
        
        if (href === '#login') {
            e.preventDefault();
            document.getElementById('loginModal').style.display = 'block';
            return;
        }
        
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            const headerHeight = document.querySelector('.header').offsetHeight;
            const targetPosition = target.offsetTop - headerHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

let currentSlide = 0;
const teamTrack = document.querySelector('.team-track');
const teamMembers = document.querySelectorAll('.team-member');
const indicators = document.querySelectorAll('.team-indicator');
const totalSlides = teamMembers.length;

function showSlide(index) {
    if (index < 0) currentSlide = totalSlides - 1;
    else if (index >= totalSlides) currentSlide = 0;
    else currentSlide = index;
    
    teamTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    teamMembers.forEach((member, i) => {
        member.classList.toggle('active', i === currentSlide);
    });
    
    indicators.forEach((indicator, i) => {
        indicator.classList.toggle('active', i === currentSlide);
    });
}

document.getElementById('prevBtn')?.addEventListener('click', () => {
    showSlide(currentSlide - 1);
});

document.getElementById('nextBtn')?.addEventListener('click', () => {
    showSlide(currentSlide + 1);
});

indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
        showSlide(index);
    });
});

setInterval(() => {
    showSlide(currentSlide + 1);
}, 5000);

// Модальное окно входа
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');

function openLoginModal() {
    loginModal.style.display = 'block';
}

function closeLoginModal() {
    loginModal.style.display = 'none';
    loginForm.reset();
}

window.addEventListener('click', function(event) {
    if (event.target === loginModal) {
        closeLoginModal();
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && loginModal.style.display === 'block') {
        closeLoginModal();
    }
});

loginForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const studentCodeInput = document.getElementById('studentCode');
    const studentRedCodeInput = document.getElementById('studentRedCode');

    const studentCodeError = document.getElementById('studentCodeError');
    const studentRedCodeError = document.getElementById('studentRedCodeError');

    let isValid = true;

    // Сброс ошибок
    [studentCodeInput, studentRedCodeInput].forEach(input => {
        input.classList.remove('error');
    });
    [studentCodeError, studentRedCodeError].forEach(err => {
        err.style.display = 'none';
        err.textContent = '';
    });

    // Проверка студенческого кода
    if (studentCodeInput.value.length !== 10) {
        studentCodeInput.classList.add('error');
        studentCodeError.textContent = 'Студенческий код должен содержать 10 символов';
        studentCodeError.style.display = 'block';
        isValid = false;
    }

    // Проверка красного кода
    if (studentRedCodeInput.value.length !== 7) {
        studentRedCodeInput.classList.add('error');
        studentRedCodeError.textContent = 'Красный код должен содержать 7 символов';
        studentRedCodeError.style.display = 'block';
        isValid = false;
    }

    if (!isValid) return;

    // Собираем данные
    const payload = {
        studentCode: studentCodeInput.value,
        studentRedCode: studentRedCodeInput.value
    };

    // Отправляем на Python сервер
    fetch('http://127.0.0.1:8000/api/save_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`Успех: ${data.message}`);
            closeLoginModal();
        } else {
            alert(`Ошибка: ${data.detail || 'Неизвестная ошибка'}`);
        }
    })
    .catch(error => {
        console.error('Ошибка запроса:', error);
        alert('Сервер недоступен.');
    });
});

['studentCode', 'studentRedCode'].forEach(id => {
    const input = document.getElementById(id);
    const error = document.getElementById(id + 'Error');

    input.addEventListener('input', () => {
        input.classList.remove('error');
        error.style.display = 'none';
    });
});

function animateOnScroll() {
    const elements = document.querySelectorAll('.about-text h3, .about-text p, .features-list li, .support-content p, .contact-info');
    
    elements.forEach((element, index) => {
        const elementTop = element.getBoundingClientRect().top;
        const elementBottom = element.getBoundingClientRect().bottom;
        
        if (elementTop < window.innerHeight && elementBottom > 0) {
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0) translateX(0)';
            }, index * 100);
        }
    });
}

function initLogo3D() {
    const logo = document.querySelector('.logo');
    if (!logo) return;
    
    logo.addEventListener('mousemove', (e) => {
        const rect = logo.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        logo.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    });
    
    logo.addEventListener('mouseleave', () => {
        logo.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
    });
}

function initTeamPhotos3D() {
    const photoContainers = document.querySelectorAll('.team-photo-3d');
    
    photoContainers.forEach(container => {
        container.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            container.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.1)`;
        });
        
        container.addEventListener('mouseleave', () => {
            container.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initLogo3D();
    initTeamPhotos3D();
    
    const elements = document.querySelectorAll('.about-text h3, .about-text p, .features-list li, .support-content p, .contact-info');
    
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    
    setTimeout(animateOnScroll, 500);
});

window.addEventListener('scroll', function() {
    animateOnScroll();
    updateActiveNavLink();
    
    const header = document.querySelector('.header');
    
    if (window.scrollY > 100) {
        header.style.background = 'rgba(10, 10, 10, 0.95)';
        header.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.3)';
    } else {
        header.style.background = 'rgba(10, 10, 10, 0.8)';
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    }
});

window.addEventListener('load', function() {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(function() {
        document.body.style.opacity = '1';
    }, 100);
});

const style3D = document.createElement('style');
document.head.appendChild(style3D);