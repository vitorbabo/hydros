// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.offsetTop - navHeight - 20;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }
    });
});

// Navbar scroll effect
const navbar = document.querySelector('.navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// Scroll reveal animation
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements for scroll reveal
const revealElements = document.querySelectorAll('.feature-card, .mode-card, .demo-item, .arch-feature');
revealElements.forEach(el => {
    el.classList.add('scroll-reveal');
    observer.observe(el);
});

// Add stagger effect to features
const features = document.querySelectorAll('.feature-card');
features.forEach((feature, index) => {
    feature.style.animationDelay = `${index * 0.1}s`;
});

// Copy code snippet functionality
const codeBlock = document.querySelector('.cta-code');
if (codeBlock) {
    codeBlock.style.position = 'relative';
    codeBlock.style.cursor = 'pointer';

    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy';
    copyButton.style.cssText = `
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: rgba(59, 130, 246, 0.2);
        border: 1px solid rgba(59, 130, 246, 0.3);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 600;
        transition: all 0.3s ease;
    `;

    copyButton.addEventListener('mouseenter', () => {
        copyButton.style.background = 'rgba(59, 130, 246, 0.3)';
    });

    copyButton.addEventListener('mouseleave', () => {
        copyButton.style.background = 'rgba(59, 130, 246, 0.2)';
    });

    copyButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        const code = codeBlock.querySelector('code').textContent;
        try {
            await navigator.clipboard.writeText(code);
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = 'Copy';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    });

    codeBlock.appendChild(copyButton);
}

// Add active state to nav links based on scroll position
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

window.addEventListener('scroll', () => {
    let current = '';
    const scrollPosition = window.pageYOffset;

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.clientHeight;

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Add parallax effect to hero background
const hero = document.querySelector('.hero');
if (hero) {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallax = scrolled * 0.5;
        hero.style.transform = `translateY(${parallax}px)`;
    });
}

// Add hover effect to stat numbers with counter animation
const statNumbers = document.querySelectorAll('.stat-number');
let hasAnimated = false;

const animateNumbers = () => {
    if (hasAnimated) return;

    statNumbers.forEach(stat => {
        const text = stat.textContent;
        const isNumeric = /^\d+/.test(text);

        if (isNumeric) {
            const target = parseInt(text);
            let current = 0;
            const increment = target / 50;
            const duration = 1000;
            const stepTime = duration / 50;

            const counter = setInterval(() => {
                current += increment;
                if (current >= target) {
                    stat.textContent = text;
                    clearInterval(counter);
                } else {
                    stat.textContent = Math.floor(current) + (text.includes('+') ? '+' : '');
                }
            }, stepTime);
        }
    });

    hasAnimated = true;
};

// Trigger number animation when stats come into view
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateNumbers();
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const statsSection = document.querySelector('.hero-stats');
if (statsSection) {
    statsObserver.observe(statsSection);
}

// Mobile menu toggle (for future implementation)
const createMobileMenu = () => {
    const nav = document.querySelector('.nav-links');
    const menuButton = document.createElement('button');
    menuButton.className = 'mobile-menu-button';
    menuButton.innerHTML = `
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
    `;

    menuButton.style.cssText = `
        display: none;
        background: none;
        border: none;
        color: var(--dark);
        cursor: pointer;
        padding: 0.5rem;
    `;

    // Show on mobile
    if (window.innerWidth <= 768) {
        menuButton.style.display = 'block';
    }

    document.querySelector('.nav-content').appendChild(menuButton);

    menuButton.addEventListener('click', () => {
        nav.classList.toggle('mobile-active');
    });
};

// Initialize mobile menu on smaller screens
if (window.innerWidth <= 768) {
    createMobileMenu();
}

// Reinitialize on resize
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const existingButton = document.querySelector('.mobile-menu-button');
        if (window.innerWidth <= 768 && !existingButton) {
            createMobileMenu();
        } else if (window.innerWidth > 768 && existingButton) {
            existingButton.remove();
        }
    }, 250);
});

// Add loading animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// Lazy load placeholder images (for when actual images are added)
const lazyLoadPlaceholders = () => {
    const placeholders = document.querySelectorAll('.screenshot-placeholder[data-src]');

    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const placeholder = entry.target;
                const src = placeholder.getAttribute('data-src');

                if (src) {
                    const img = document.createElement('img');
                    img.src = src;
                    img.alt = placeholder.querySelector('p').textContent;
                    img.style.cssText = `
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        border-radius: inherit;
                    `;

                    img.onload = () => {
                        placeholder.innerHTML = '';
                        placeholder.appendChild(img);
                        placeholder.style.padding = '0';
                        placeholder.style.border = 'none';
                    };
                }

                imageObserver.unobserve(placeholder);
            }
        });
    });

    placeholders.forEach(placeholder => imageObserver.observe(placeholder));
};

lazyLoadPlaceholders();

console.log('%c🌊 Hydros Landing Page Loaded! ', 'background: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%); color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold;');
console.log('To replace placeholder images, add actual screenshots to the project and update the src attributes.');
