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

document.addEventListener('DOMContentLoaded', function() {
    fetch('http://127.0.0.1:8000/api/theme', {
        credentials: 'include'
    })
    .then(r => r.json())
    .then(d => {
        if (window.__themeLocked) return;
        if (!d || !d.success) return;
        document.body.classList.remove('theme-dark', 'theme-light');
        document.body.classList.add(d.theme === 'light' ? 'theme-light' : 'theme-dark');
    })
    .catch(() => {
    });

    const loginLink = document.querySelector('.nav-link.login-btn');
    const startBtn = document.querySelector('.start-btn');

    if (!loginLink && !startBtn) return;

    fetch('http://127.0.0.1:8000/api/dashboard', {
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (!data || !data.success) return;

        if (loginLink) {
            loginLink.textContent = 'Профиль';
            loginLink.setAttribute('href', 'dashboard.html');
            loginLink.classList.remove('login-btn');

            loginLink.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'dashboard.html';
            });
        }

        if (startBtn) {
            startBtn.setAttribute('href', 'dashboard.html');
            startBtn.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'dashboard.html';
            });
        }
    })
    .catch(() => {
    });
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
            openLoginModal();
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
    if (!teamTrack || !totalSlides) return;
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

if (teamTrack && totalSlides) {
    setInterval(() => {
        showSlide(currentSlide + 1);
    }, 5000);
}

// Модальное окно входа
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');

function openLoginModal() {
    if (!loginModal) return;
    loginModal.classList.add('show');
}

function closeLoginModal() {
    if (!loginModal) return;
    loginModal.classList.remove('show');
    if (loginForm) loginForm.reset();
}

window.addEventListener('click', function(event) {
    if (loginModal && event.target === loginModal) {
        closeLoginModal();
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && loginModal && loginModal.classList.contains('show')) {
        closeLoginModal();
    }
});

if (loginForm) loginForm.addEventListener('submit', function(e) {
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
        credentials: 'include',  // Включаем отправку cookie
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Ответ сервера:', data);
        
        if (data.success) {
            closeLoginModal();
            
            // Небольшая задержка чтобы сессия успела сохраниться
            setTimeout(() => {
                // Редирект в личный кабинет
                if (data.redirect) {
                    const redirectUrl = data.redirect.replace('/api/dashboard', 'dashboard.html');
                    console.log('Редирект на:', redirectUrl);
                    window.location.href = redirectUrl;
                } else {
                    // Fallback: редирект с student_code
                    const fallbackUrl = `dashboard.html?student_code=${payload.studentCode}`;
                    console.log('Fallback редирект на:', fallbackUrl);
                    window.location.href = fallbackUrl;
                }
            }, 500);
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

    if (!input || !error) return;

    input.addEventListener('input', () => {
        input.classList.remove('error');
        error.style.display = 'none';
    });
});

function animateOnScroll() {
    const elements = document.querySelectorAll('.about-text h3, .about-text p, .features-list li, .support-content p, .contact-info');
    
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementBottom = element.getBoundingClientRect().bottom;
        
        if (elementTop < window.innerHeight && elementBottom > 0) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
}

// Limit scroll to content boundaries
function initScrollBoundaries() {
    const carousel = document.querySelector('.schedule-fullscreen-carousel');
    if (!carousel) return;
    
    let isScrolling = false;
    let maxScroll = 0;
    
    function updateMaxScroll() {
        const activeColumn = document.querySelector('.schedule-column:not(.swapped-left)') || 
                               document.querySelector('#currentWeek');
        if (activeColumn) {
            // Calculate the actual scrollable height
            const columnHeight = activeColumn.scrollHeight;
            const carouselHeight = carousel.clientHeight;
            maxScroll = Math.max(0, columnHeight - carouselHeight);
        }
    }
    
    function updateBoundaryClasses() {
        const currentScroll = carousel.scrollTop;
        const atTop = currentScroll <= 0;
        const atBottom = currentScroll >= maxScroll;
        
        carousel.classList.toggle('at-top', atTop);
        carousel.classList.toggle('at-bottom', atBottom);
    }
    
    // Initial calculation
    updateMaxScroll();
    updateBoundaryClasses();
    
    carousel.addEventListener('scroll', () => {
        if (isScrolling) return;
        isScrolling = true;
        
        requestAnimationFrame(() => {
            const currentScroll = carousel.scrollTop;
            
            // Strict boundary enforcement
            if (currentScroll > maxScroll) {
                carousel.scrollTop = maxScroll;
            } else if (currentScroll < 0) {
                carousel.scrollTop = 0;
            }
            
            updateBoundaryClasses();
            isScrolling = false;
        });
    });
    
    // Update boundaries when switching weeks
    const originalToggleScheduleCarousel = toggleScheduleCarousel;
    toggleScheduleCarousel = function() {
        originalToggleScheduleCarousel();
        setTimeout(() => {
            updateMaxScroll();
            updateBoundaryClasses();
        }, 150); // Update after animation
    };
}

// Schedule Fullscreen Carousel
let isCurrentWeekVisible = true;
const scheduleToggleBtn = document.getElementById('scheduleToggleBtn');
const currentWeekColumn = document.getElementById('currentWeek');
const nextWeekColumn = document.getElementById('nextWeek');

// JavaScript animation synced with carousel lists
function animateButtonBehindLists(targetPosition) {
    const carousel = document.querySelector('.schedule-fullscreen-carousel');
    if (!carousel || !scheduleToggleBtn) return;
    
    const carouselRect = carousel.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Calculate visible portion of carousel
    const visibleTop = Math.max(0, carouselRect.top);
    const visibleBottom = Math.min(viewportHeight, carouselRect.bottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    
    if (visibleHeight > 0) {
        const buttonTop = visibleTop + (visibleHeight / 2);
        
        // Calculate positions behind lists (same as carousel edges)
        const rightEdge = carouselRect.right - 60; // 60px = button width + margin
        const leftEdge = carouselRect.left + 20; // 20px margin
        
        // Get current button position
        const currentRect = scheduleToggleBtn.getBoundingClientRect();
        const currentPos = currentRect.left;
        
        // Set target position
        const targetPos = targetPosition === 'left' ? leftEdge : rightEdge;
        
        let startTime = null;
        const duration = 570; // Slightly faster than carousel lists
        
        function animate(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            
            if (elapsed < duration) {
                const progress = elapsed / duration;
                // Exact same easing as carousel lists: cubic-bezier(0.4, 0, 0.2, 1)
                const easeProgress = progress < 0.5 
                    ? 4 * progress * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                
                const currentX = currentPos + (targetPos - currentPos) * easeProgress;
                
                // Rotate arrow element during button movement
                const arrowProgress = easeProgress;
                const arrowRotation = targetPosition === 'left' ? 
                    180 * arrowProgress : // Rotate to left during movement
                    180 * (1 - arrowProgress); // Rotate back to right during movement
                
                scheduleToggleBtn.style.position = 'fixed';
                scheduleToggleBtn.style.top = buttonTop + 'px';
                scheduleToggleBtn.style.left = currentX + 'px';
                scheduleToggleBtn.style.right = 'auto';
                scheduleToggleBtn.style.transform = 'translateY(-50%) translateX(0)';
                scheduleToggleBtn.style.zIndex = '3';
                
                // Rotate only the arrow element
                const arrowElement = scheduleToggleBtn.querySelector('.toggle-arrow');
                if (arrowElement) {
                    arrowElement.style.transform = `rotate(${arrowRotation}deg)`;
                }
                
                requestAnimationFrame(animate);
            } else {
                // Set final position
                scheduleToggleBtn.style.position = 'fixed';
                scheduleToggleBtn.style.top = buttonTop + 'px';
                scheduleToggleBtn.style.left = targetPos + 'px';
                scheduleToggleBtn.style.right = 'auto';
                scheduleToggleBtn.style.transform = 'translateY(-50%) translateX(0)';
                scheduleToggleBtn.style.zIndex = '3';
                
                // Set final arrow rotation
                const arrowElement = scheduleToggleBtn.querySelector('.toggle-arrow');
                if (arrowElement) {
                    arrowElement.style.transform = `rotate(${targetPosition === 'left' ? 180 : 0}deg)`;
                }
                
                // Update CSS classes
                if (targetPosition === 'left') {
                    scheduleToggleBtn.classList.add('left-position');
                } else {
                    scheduleToggleBtn.classList.remove('left-position');
                }
            }
        }
        
        requestAnimationFrame(animate);
    }
}

// Update button position to align with carousel edges
function updateButtonPosition() {
    const carousel = document.querySelector('.schedule-fullscreen-carousel');
    if (!carousel || !scheduleToggleBtn) return;
    
    const carouselRect = carousel.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Calculate visible portion of carousel
    const visibleTop = Math.max(0, carouselRect.top);
    const visibleBottom = Math.min(viewportHeight, carouselRect.bottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    
    if (visibleHeight > 0) {
        // Center button in visible area
        const buttonTop = visibleTop + (visibleHeight / 2);
        
        // Calculate both positions
        const buttonRight = window.innerWidth - carouselRect.right + 20; // 20px inside carousel edge
        const buttonLeft = carouselRect.left + 20; // 20px inside carousel edge
        
        // Check current position to determine which side to use
        const isLeftPosition = scheduleToggleBtn.classList.contains('left-position');
        
        scheduleToggleBtn.style.position = 'fixed';
        scheduleToggleBtn.style.top = buttonTop + 'px';
        
        if (isLeftPosition) {
            // Keep left position
            scheduleToggleBtn.style.left = buttonLeft + 'px';
            scheduleToggleBtn.style.right = 'auto';
        } else {
            // Keep right position
            scheduleToggleBtn.style.right = buttonRight + 'px';
            scheduleToggleBtn.style.left = 'auto';
        }
        
        scheduleToggleBtn.style.transform = 'translateY(-50%) translateX(0)';
        scheduleToggleBtn.style.zIndex = '3';
    }
}

// Two-stage animation function
function animateButtonToPosition(targetPosition) {
    const carousel = document.querySelector('.schedule-fullscreen-carousel');
    if (!carousel || !scheduleToggleBtn) return;
    
    const carouselRect = carousel.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Calculate visible portion of carousel
    const visibleTop = Math.max(0, carouselRect.top);
    const visibleBottom = Math.min(viewportHeight, carouselRect.bottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    
    if (visibleHeight > 0) {
        const buttonTop = visibleTop + (visibleHeight / 2);
        
        // Stage 1: Move to carousel edge
        const edgePosition = targetPosition === 'left' ? 
            carouselRect.left + 20 : 
            carouselRect.right - 60;
        
        // Stage 2: Final position
        const finalPosition = targetPosition === 'left' ? 
            carouselRect.left + 20 : 
            carouselRect.right - 60;
        
        let startTime = null;
        const duration1 = 800; // First stage
        const duration2 = 400; // Second stage
        
        function animate(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            
            if (elapsed < duration1) {
                // Stage 1: Move to edge
                const progress = elapsed / duration1;
                const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
                const currentPos = edgePosition + (finalPosition - edgePosition) * easeProgress;
                
                scheduleToggleBtn.style.position = 'fixed';
                scheduleToggleBtn.style.top = buttonTop + 'px';
                scheduleToggleBtn.style.left = currentPos + 'px';
                scheduleToggleBtn.style.right = 'auto';
                scheduleToggleBtn.style.transform = 'translateY(-50%) translateX(0)';
                scheduleToggleBtn.style.zIndex = '3';
                
                requestAnimationFrame(animate);
            } else if (elapsed < duration1 + duration2) {
                // Stage 2: Smooth final movement
                const progress = (elapsed - duration1) / duration2;
                const easeProgress = 1 - Math.pow(1 - progress, 2); // Ease out quad
                
                scheduleToggleBtn.style.position = 'fixed';
                scheduleToggleBtn.style.top = buttonTop + 'px';
                scheduleToggleBtn.style.left = finalPosition + 'px';
                scheduleToggleBtn.style.right = 'auto';
                scheduleToggleBtn.style.transform = `translateY(-50%) translateX(${easeProgress * 20}px)`;
                scheduleToggleBtn.style.zIndex = '3';
                
                requestAnimationFrame(animate);
            } else {
                // Set final CSS classes
                if (targetPosition === 'left') {
                    scheduleToggleBtn.classList.add('left-position');
                    scheduleToggleBtn.style.left = '20px';
                    scheduleToggleBtn.style.right = 'auto';
                } else {
                    scheduleToggleBtn.classList.remove('left-position');
                    scheduleToggleBtn.style.right = '20px';
                    scheduleToggleBtn.style.left = 'auto';
                }
                
                scheduleToggleBtn.style.transform = 'translateY(-50%) translateX(0)';
            }
        }
        
        requestAnimationFrame(animate);
    }
}

// Update position on scroll, resize and carousel scroll
window.addEventListener('scroll', updateButtonPosition);
window.addEventListener('resize', updateButtonPosition);

// Also listen to carousel scroll
document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.querySelector('.schedule-fullscreen-carousel');
    if (carousel) {
        carousel.addEventListener('scroll', updateButtonPosition);
        updateButtonPosition(); // Initial position
    }
});

function toggleScheduleCarousel() {
    if (!scheduleToggleBtn || !currentWeekColumn || !nextWeekColumn) return;
    
    isCurrentWeekVisible = !isCurrentWeekVisible;
    
    if (isCurrentWeekVisible) {
        // Show current week, hide next week
        currentWeekColumn.classList.remove('swapped-left');
        nextWeekColumn.classList.remove('swapped-right');
        // Animate button to right position
        animateButtonBehindLists('right');
    } else {
        // Show next week, hide current week
        currentWeekColumn.classList.add('swapped-left');
        nextWeekColumn.classList.add('swapped-right');
        // Animate button to left position
        animateButtonBehindLists('left');
    }
    
    // Update position after animation
    setTimeout(() => {
        updateButtonPosition();
        // Reset scroll to top
        const carousel = document.querySelector('.schedule-fullscreen-carousel');
        if (carousel) {
            carousel.scrollTop = 0;
        }
    }, 100);
}

if (scheduleToggleBtn) {
    scheduleToggleBtn.addEventListener('click', toggleScheduleCarousel);
}

// Schedule Modal Functions
function openScheduleModal(type) {
    const modal = document.getElementById('scheduleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    if (!modal || !modalTitle || !modalContent) return;
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    
    let title, scheduleData;
    
    if (type === 'today') {
        title = `Расписание на сегодня (${dayNames[today.getDay()]}, ${today.getDate()} ${monthNames[today.getMonth()]})`;
        scheduleData = [
            { time: '08:30 - 10:05', subject: 'Математика', room: 'ауд. 201' },
            { time: '10:25 - 12:00', subject: 'Физика', room: 'ауд. 305' },
            { time: '12:20 - 13:55', subject: 'Программирование', room: 'лаб. 102' },
            { time: '14:15 - 15:50', subject: 'Английский', room: 'ауд. 410' }
        ];
    } else {
        title = `Расписание на завтра (${dayNames[tomorrow.getDay()]}, ${tomorrow.getDate()} ${monthNames[tomorrow.getMonth()]})`;
        scheduleData = [
            { time: '08:30 - 10:05', subject: 'Химия', room: 'лаб. 203' },
            { time: '10:25 - 12:00', subject: 'История', room: 'ауд. 115' },
            { time: '12:20 - 13:55', subject: 'Биология', room: 'лаб. 301' },
            { time: '14:15 - 15:50', subject: 'Литература', room: 'ауд. 208' }
        ];
    }
    
    modalTitle.textContent = title;
    
    let scheduleHTML = '<div class="schedule-list">';
    scheduleData.forEach(item => {
        scheduleHTML += `
            <div class="schedule-item">
                <span class="time">${item.time}</span>
                <span class="subject">${item.subject}</span>
                <span class="room">${item.room}</span>
            </div>
        `;
    });
    scheduleHTML += '</div>';
    
    modalContent.innerHTML = scheduleHTML;
    modal.style.display = 'block';
}

function closeScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const scheduleModal = document.getElementById('scheduleModal');
    if (scheduleModal && event.target === scheduleModal) {
        closeScheduleModal();
    }
});

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
    
    // Initialize carousel height adjustment
    setTimeout(adjustCarouselHeight, 200); // Small delay for fonts to load
    initScrollBoundaries(); // Initialize scroll boundaries
});

window.addEventListener('scroll', function() {
    animateOnScroll();
    updateActiveNavLink();
    
    const header = document.querySelector('.header');
    if (!header) return;

    const isLightTheme = document.body.classList.contains('theme-light');
    
    if (window.scrollY > 100) {
        header.style.background = isLightTheme
            ? 'rgba(246, 247, 249, 0.95)'
            : 'rgba(10, 10, 10, 0.95)';
        header.style.boxShadow = isLightTheme
            ? '0 4px 30px rgba(0, 0, 0, 0.12)'
            : '0 4px 30px rgba(0, 0, 0, 0.3)';
    } else {
        header.style.background = isLightTheme
            ? 'rgba(246, 247, 249, 0.75)'
            : 'rgba(10, 10, 10, 0.8)';
        header.style.boxShadow = isLightTheme
            ? '0 2px 20px rgba(0, 0, 0, 0.08)'
            : '0 2px 20px rgba(0, 0, 0, 0.1)';
    }
});

// Also update header when theme changes
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const header = document.querySelector('.header');
            if (!header) return;
            
            const isLightTheme = document.body.classList.contains('theme-light');
            
            if (window.scrollY > 100) {
                header.style.background = isLightTheme
                    ? 'rgba(246, 247, 249, 0.95)'
                    : 'rgba(10, 10, 10, 0.95)';
                header.style.boxShadow = isLightTheme
                    ? '0 4px 30px rgba(0, 0, 0, 0.12)'
                    : '0 4px 30px rgba(0, 0, 0, 0.3)';
            } else {
                header.style.background = isLightTheme
                    ? 'rgba(246, 247, 249, 0.75)'
                    : 'rgba(10, 10, 10, 0.8)';
                header.style.boxShadow = isLightTheme
                    ? '0 2px 20px rgba(0, 0, 0, 0.08)'
                    : '0 2px 20px rgba(0, 0, 0, 0.1)';
            }
        }
    });
});

observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
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